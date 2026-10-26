import type { KeyValueStorage } from '../core/types';
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterMs = 0,
  ) {
    super(message);
  }
}
export type Fetcher = typeof fetch;
export interface RatePolicy {
  spacingMs: number;
  perMinute: number;
  perHour: number;
}
export const POLICIES: Record<string, RatePolicy> = {
  celestrak: { spacingMs: 2000, perMinute: 20, perHour: 120 },
  spacetrack: { spacingMs: 2200, perMinute: 28, perHour: 280 },
  n2yo: { spacingMs: 1200, perMinute: 60, perHour: 950 },
  wheretheiss: { spacingMs: 1100, perMinute: 55, perHour: 3000 },
  proxy: { spacingMs: 150, perMinute: 100, perHour: 2000 },
};
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** One FIFO gate per provider; persisted rolling windows survive process restarts. */
export class RequestGate {
  private queue = Promise.resolve();
  private times: number[] | null = null;
  private blockedUntil = 0;
  constructor(
    public id: string,
    private storage?: KeyValueStorage,
    private now = Date.now,
    private sleep = delay,
  ) {}
  reserve() {
    const next = this.queue.then(async () => {
      if (!this.times) {
        try {
          const state = JSON.parse((await this.storage?.getItem(`quota:${this.id}`)) || '{}');
          this.times = state.times || [];
          this.blockedUntil = state.blockedUntil || 0;
        } catch {
          this.times = [];
        }
      }
      const policy = POLICIES[this.id],
        now = this.now();
      this.times = this.times!.filter((t) => now - t < 3600_000);
      const minute = this.times.filter((t) => now - t < 60_000);
      let due = Math.max(now, this.blockedUntil, (this.times.at(-1) || 0) + policy.spacingMs);
      if (minute.length >= policy.perMinute)
        due = Math.max(due, minute[minute.length - policy.perMinute] + 60_000);
      if (this.times.length >= policy.perHour)
        due = Math.max(due, this.times[this.times.length - policy.perHour] + 3600_000);
      if (due - now > 15_000)
        throw new HttpError(`Límite de ${this.id}; reintentar más tarde.`, 429, due - now);
      if (due > now) await this.sleep(due - now);
      this.times.push(this.now());
      await this.persist();
    });
    this.queue = next.catch(() => {});
    return next;
  }
  async block(ms: number) {
    this.blockedUntil = Math.max(this.blockedUntil, this.now() + ms);
    await this.persist();
  }
  private async persist() {
    await this.storage?.setItem(
      `quota:${this.id}`,
      JSON.stringify({ times: this.times, blockedUntil: this.blockedUntil }),
    );
  }
}
export class ProviderHttp {
  constructor(
    private gate: RequestGate,
    private fetcher: Fetcher = fetch,
  ) {}
  async request<T>(
    url: string,
    init: RequestInit = {},
    format: 'json' | 'text' = 'json',
    onResponse?: (response: Response) => void,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.gate.reserve();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await this.fetcher(url, { ...init, signal: controller.signal });
        if (!response.ok) {
          const raw = response.headers.get('retry-after');
          const retry = raw
            ? /^\d+$/.test(raw)
              ? Number(raw) * 1000
              : Math.max(0, Date.parse(raw) - Date.now())
            : 0;
          if (response.status === 429) await this.gate.block(retry || 60_000);
          // URLs and response bodies may contain credentials. Never surface them.
          throw new HttpError(
            `Proveedor ${this.gate.id}: HTTP ${response.status}`,
            response.status,
            retry,
          );
        }
        onResponse?.(response);
        return (format === 'json' ? await response.json() : await response.text()) as T;
      } catch (error) {
        const retryable =
          !(error instanceof HttpError) || error.status === 429 || error.status >= 500;
        if (
          attempt === 2 ||
          !retryable ||
          (error instanceof HttpError && error.retryAfterMs > 15_000)
        )
          throw error instanceof HttpError
            ? error
            : new Error(`${this.gate.id} no está disponible (red o tiempo de espera).`);
        await delay(
          Math.max(500 * 2 ** attempt, error instanceof HttpError ? error.retryAfterMs : 0),
        );
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error('No se pudo completar la consulta.');
  }
}

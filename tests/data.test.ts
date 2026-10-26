import { describe, it, expect, vi } from 'vitest';
import { OrbitalRepository, TTL_MS } from '../src/data/repository';
import { ProviderHttp, RequestGate } from '../src/data/http';
import { SpaceTrackProvider } from '../src/data/providers';
import type { DataProvider, KeyValueStorage, OrbitalObject } from '../src/core/types';
import snapshot from '../assets/catalog-snapshot.json';
const object = (snapshot as OrbitalObject[])[0];
const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: async (k: string) => map.get(k) || null,
    setItem: async (k: string, v: string) => {
      map.set(k, v);
    },
  } satisfies KeyValueStorage;
};
function provider(id: DataProvider['id'], getCatalog: DataProvider['getCatalog']): DataProvider {
  return {
    id,
    getCatalog,
    getOrbitalData: async () => object,
    getValidationPosition: async () => {
      throw new Error('Unsupported');
    },
  };
}
describe('repositorio con caché y fallback', () => {
  it('deduplica consultas concurrentes y respeta TTL de 18 horas', async () => {
    let now = 1000;
    const fetch = vi.fn(async () => [object]);
    const repo = new OrbitalRepository([provider('celestrak', fetch)], memory(), [], () => now);
    await Promise.all([repo.getCatalog('stations'), repo.getCatalog('stations')]);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += TTL_MS - 1;
    await repo.getCatalog('stations');
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 2;
    await repo.getCatalog('stations');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('caída primaria conmuta a Space-Track e informa el incidente', async () => {
    const repo = new OrbitalRepository(
      [
        provider('celestrak', async () => {
          throw new Error('503');
        }),
        provider('spacetrack', async () => [object]),
      ],
      memory(),
    );
    const r = await repo.getCatalog('stations');
    expect(r.provider).toBe('spacetrack');
    expect(r.stale).toBe(false);
    expect(r.warnings[0]).toContain('503');
  });
  it('sin proveedores preserva elementos vencidos sin cambiar su epoch', async () => {
    const storage = memory();
    const old = {
      objects: [object],
      fetchedAt: 1,
      provider: 'celestrak',
      warnings: [],
      stale: false,
    };
    await storage.setItem('catalog:stations', JSON.stringify(old));
    const repo = new OrbitalRepository([], storage, [], () => TTL_MS + 10);
    const r = await repo.getCatalog('stations');
    expect(r.stale).toBe(true);
    expect(r.objects[0].epoch).toBe(object.epoch);
  });
  it('snapshot se declara desactualizado y nunca se presenta como dato recién descargado', async () => {
    const repo = new OrbitalRepository([], memory(), [object]);
    const r = await repo.getCatalog(object.group);
    expect(r.bundled).toBe(true);
    expect(r.fetchedAt).toBe(0);
    expect(r.stale).toBe(true);
  });
  it('caché corrupta no impide recuperar el catálogo', async () => {
    const storage = memory();
    await storage.setItem('catalog:stations', 'broken');
    const repo = new OrbitalRepository([provider('celestrak', async () => [object])], storage);
    expect((await repo.getCatalog('stations')).objects).toHaveLength(1);
  });
});
describe('límites, backoff y credenciales', () => {
  it('espacia consultas de Where the ISS at? y persiste la cuota', async () => {
    let now = 2_000_000;
    const waits: number[] = [];
    const storage = memory();
    const sleep = async (ms: number) => {
      waits.push(ms);
      now += ms;
    };
    const gate = new RequestGate('wheretheiss', storage, () => now, sleep);
    await Promise.all([gate.reserve(), gate.reserve(), gate.reserve()]);
    expect(waits).toEqual([1100, 1100]);
    const restarted = new RequestGate('wheretheiss', storage, () => now, sleep);
    await restarted.reserve();
    expect(waits.at(-1)).toBe(1100);
  });
  it('respeta el límite horario de Space-Track, aun reiniciando', async () => {
    const storage = memory();
    const now = 3600000;
    await storage.setItem(
      'quota:spacetrack',
      JSON.stringify({ times: Array.from({ length: 280 }, () => now - 120000) }),
    );
    const gate = new RequestGate('spacetrack', storage, () => now);
    await expect(gate.reserve()).rejects.toMatchObject({ status: 429 });
  });
  it('Retry-After bloquea la fuente para llamadas siguientes', async () => {
    const gate = new RequestGate('n2yo');
    const fetcher = vi.fn(
      async () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
    );
    const http = new ProviderHttp(gate, fetcher);
    await expect(http.request('https://example.com')).rejects.toMatchObject({ status: 429 });
    await expect(gate.reserve()).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('403 no se reintenta ni filtra URL, API key o cuerpo', async () => {
    const fetcher = vi.fn(async () => new Response('secret-body', { status: 403 }));
    const http = new ProviderHttp(new RequestGate('n2yo'), fetcher);
    try {
      await http.request('https://example.com?apiKey=TOP-SECRET');
      throw new Error('Expected failure');
    } catch (e) {
      expect((e as Error).message).not.toContain('SECRET');
      expect((e as Error).message).not.toContain('secret-body');
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('Space-Track conserva la cookie del login y la envía solo a su host', async () => {
    let now = 100000;
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return calls.length === 1
        ? new Response('ok', { headers: { 'Set-Cookie': 'session=demo; HttpOnly; Secure' } })
        : Response.json([object.omm]);
    });
    const http = new ProviderHttp(
      new RequestGate(
        'spacetrack',
        undefined,
        () => now,
        async (ms) => {
          now += ms;
        },
      ),
      fetcher,
    );
    const p = new SpaceTrackProvider(http, 'person', 'password');
    await p.getCatalog('stations');
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('https://www.space-track.org/');
    expect((calls[1].init?.headers as Record<string, string>).Cookie).toBe('session=demo');
  });
});

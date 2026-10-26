import type {
  CatalogGroup,
  CatalogResult,
  DataProvider,
  KeyValueStorage,
  OrbitalObject,
} from '../core/types';
export const TTL_MS = 18 * 3600_000;
export class OrbitalRepository {
  private inFlight = new Map<string, Promise<CatalogResult>>();
  constructor(
    private providers: DataProvider[],
    private storage: KeyValueStorage,
    private bundled: OrbitalObject[] = [],
    private now = Date.now,
  ) {}
  getCatalog(group: CatalogGroup) {
    const key = `catalog:${group}`;
    if (this.inFlight.has(key)) return this.inFlight.get(key)!;
    const task = this.load(key, group);
    this.inFlight.set(key, task);
    task.finally(() => this.inFlight.delete(key)).catch(() => {});
    return task;
  }
  private async load(key: string, group: CatalogGroup): Promise<CatalogResult> {
    let cache: CatalogResult | null = null;
    try {
      cache = JSON.parse((await this.storage.getItem(key)) || 'null');
    } catch {
      /* recover from invalid storage */
    }
    if (cache?.objects?.length && this.now() - cache.fetchedAt < TTL_MS)
      return { ...cache, stale: false, warnings: [] };
    const warnings: string[] = [];
    for (const provider of this.providers) {
      try {
        const objects = await provider.getCatalog(group);
        if (!objects.length) throw new Error('Catálogo vacío.');
        const result: CatalogResult = {
          objects,
          fetchedAt: this.now(),
          provider: provider.id,
          stale: false,
          warnings,
        };
        await this.storage.setItem(key, JSON.stringify(result));
        return result;
      } catch (e) {
        warnings.push(`${provider.id}: ${e instanceof Error ? e.message : 'No disponible'}`);
      }
    }
    if (cache?.objects?.length) return { ...cache, stale: true, warnings };
    const objects = this.bundled.filter((o) => o.group === group);
    if (objects.length)
      return { objects, fetchedAt: 0, provider: 'snapshot', stale: true, bundled: true, warnings };
    throw new Error(`No se pudo cargar ${group}. ${warnings.join(' · ')}`);
  }
  async getOrbitalData(id: number, group: CatalogGroup): Promise<OrbitalObject> {
    const catalog = await this.getCatalog(group).catch(() => null);
    const cached = catalog?.objects.find((o) => o.id === id);
    if (cached && !catalog?.stale) return cached;
    for (const provider of this.providers) {
      try {
        const o = await provider.getOrbitalData(id, group);
        if (o) return o;
      } catch {
        /* ordered fallback */
      }
    }
    if (cached) return cached;
    throw new Error(`No se encontraron elementos orbitales para NORAD ${id}.`);
  }
}

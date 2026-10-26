import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CelesTrakProvider, WhereTheIssProvider } from './providers';
import { ProviderHttp, RequestGate } from './http';
import { OrbitalRepository, TTL_MS } from './repository';
import type {
  CatalogGroup,
  CatalogResult,
  Observer,
  OrbitalObject,
  ValidationPosition,
} from '../core/types';
import snapshot from '../../assets/catalog-snapshot.json';

export const apiUrl = () =>
  (
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === 'web'
      ? `${globalThis.location?.protocol || 'http:'}//${globalThis.location?.hostname || 'localhost'}:3001`
      : 'http://localhost:3001')
  ).replace(/\/$/, '');
const directRepo = new OrbitalRepository(
  [new CelesTrakProvider(new ProviderHttp(new RequestGate('celestrak', AsyncStorage)))],
  AsyncStorage,
  snapshot as OrbitalObject[],
);
const iss = new WhereTheIssProvider(new ProviderHttp(new RequestGate('wheretheiss', AsyncStorage)));
const inFlight = new Map<CatalogGroup, Promise<CatalogResult>>();
async function api<T>(path: string): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const r = await fetch(apiUrl() + path, { signal: controller.signal });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `Proxy HTTP ${r.status}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
export function loadCatalog(group: CatalogGroup): Promise<CatalogResult> {
  if (inFlight.has(group)) return inFlight.get(group)!;
  const task = (async () => {
    const key = `proxy-catalog:${group}`;
    let cached: CatalogResult | null = null;
    try {
      cached = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
    } catch {}
    if (cached?.objects?.length && Date.now() - cached.fetchedAt < TTL_MS && !cached.stale)
      return cached;
    try {
      const result = await api<CatalogResult>(`/api/catalog?group=${group}`);
      await AsyncStorage.setItem(key, JSON.stringify(result));
      return result;
    } catch (e) {
      if (cached?.objects?.length)
        return {
          ...cached,
          stale: true,
          warnings: [...cached.warnings, 'Proxy sin conexión; se usa caché local.'],
        };
      const direct = await directRepo.getCatalog(group);
      return {
        ...direct,
        warnings: ['Proxy no disponible. Se intentó CelesTrak directo.', ...direct.warnings],
      };
    }
  })();
  inFlight.set(group, task);
  task.finally(() => inFlight.delete(group)).catch(() => {});
  return task;
}
const objectJobs = new Map<number, Promise<OrbitalObject>>();
export function loadObject(id: number, group: CatalogGroup): Promise<OrbitalObject> {
  const pending = objectJobs.get(id);
  if (pending) return pending;
  const task = (async () => {
    const key = `orbital-object:${id}`;
    let cached: { object: OrbitalObject; fetchedAt: number } | null = null;
    try {
      cached = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
    } catch {}
    if (cached?.object?.id === id && Date.now() - cached.fetchedAt < TTL_MS) return cached.object;
    try {
      const object = await api<OrbitalObject>(`/api/orbital?id=${id}&group=${group}`);
      await AsyncStorage.setItem(key, JSON.stringify({ object, fetchedAt: Date.now() }));
      return object;
    } catch {
      if (cached?.object?.id === id) return cached.object;
      return directRepo.getOrbitalData(id, group);
    }
  })();
  objectJobs.set(id, task);
  task.finally(() => objectJobs.delete(id)).catch(() => {});
  return task;
}
export async function validationPosition(
  id: number,
  source: 'n2yo' | 'wheretheiss',
  o: Observer,
): Promise<ValidationPosition> {
  try {
    return await api<ValidationPosition>(
      `/api/validation?id=${id}&source=${source}&lat=${o.latitude}&lon=${o.longitude}&alt=${o.altitude}`,
    );
  } catch (e) {
    if (source === 'wheretheiss') return iss.getValidationPosition(id);
    throw e;
  }
}
export async function providerHealth() {
  return api<{ ok: boolean; n2yo: boolean; spacetrack: boolean; ttlHours: number }>('/health');
}

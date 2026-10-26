import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  CelesTrakProvider,
  N2yoProvider,
  SpaceTrackProvider,
  WhereTheIssProvider,
} from '../src/data/providers';
import { ProviderHttp, RequestGate, HttpError } from '../src/data/http';
import { OrbitalRepository } from '../src/data/repository';
import { GROUPS } from '../src/core/types';
import type { CatalogGroup, KeyValueStorage, Observer } from '../src/core/types';

const cachePath = path.resolve('.server-cache');
export const diskStorage: KeyValueStorage = {
  async getItem(key) {
    try {
      return await readFile(path.join(cachePath, `${encodeURIComponent(key)}.json`), 'utf8');
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    await mkdir(cachePath, { recursive: true });
    await writeFile(path.join(cachePath, `${encodeURIComponent(key)}.json`), value);
  },
};
const http = (id: string) => new ProviderHttp(new RequestGate(id, diskStorage));
const celestrak = new CelesTrakProvider(http('celestrak'));
const space = new SpaceTrackProvider(
  http('spacetrack'),
  process.env.SPACETRACK_IDENTITY || '',
  process.env.SPACETRACK_PASSWORD || '',
);
const n2yo = new N2yoProvider(http('n2yo'), process.env.N2YO_API_KEY || '');
const iss = new WhereTheIssProvider(http('wheretheiss'));
const repo = new OrbitalRepository([celestrak, space], diskStorage);
const validationCache = new Map<string, { until: number; value: unknown }>();
const validationJobs = new Map<string, Promise<unknown>>();
const allowed = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(','),
);
const requests = new Map<string, { start: number; count: number }>();
const integer = (s: string | null) => {
  const n = Number(s);
  if (!s || !Number.isSafeInteger(n) || n < 1 || n > 999999999)
    throw new HttpError('NORAD ID inválido.', 400);
  return n;
};
const numeric = (s: string | null, min: number, max: number) => {
  const n = Number(s);
  if (s === null || !Number.isFinite(n) || n < min || n > max)
    throw new HttpError('Coordenadas inválidas.', 400);
  return n;
};
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Origen web no permitido.' }));
    return;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Método no permitido.' }));
    return;
  }
  const ip = req.socket.remoteAddress || 'unknown';
  const rate = requests.get(ip);
  if (!rate || Date.now() - rate.start > 60_000) requests.set(ip, { start: Date.now(), count: 1 });
  else if (++rate.count > 120) {
    res.writeHead(429, { 'Retry-After': '60' });
    res.end(JSON.stringify({ error: 'Demasiadas consultas.' }));
    return;
  }
  if (requests.size > 1000)
    for (const [key, v] of requests) if (Date.now() - v.start > 60_000) requests.delete(key);
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let result: unknown;
    if (url.pathname === '/health')
      result = {
        ok: true,
        service: 'satellite-tracker',
        n2yo: !!process.env.N2YO_API_KEY,
        spacetrack: !!(process.env.SPACETRACK_IDENTITY && process.env.SPACETRACK_PASSWORD),
        ttlHours: 18,
      };
    else if (url.pathname === '/api/catalog') {
      const group = url.searchParams.get('group') as CatalogGroup;
      if (!GROUPS.includes(group)) throw new HttpError('Grupo no admitido.', 400);
      result = await repo.getCatalog(group);
    } else if (url.pathname === '/api/orbital') {
      const id = integer(url.searchParams.get('id')),
        group = (url.searchParams.get('group') || 'stations') as CatalogGroup;
      if (!GROUPS.includes(group)) throw new HttpError('Grupo no admitido.', 400);
      try {
        result = await repo.getOrbitalData(id, group);
      } catch {
        try {
          result = await n2yo.getOrbitalData(id, group);
        } catch {
          result = await iss.getOrbitalData(id, group);
        }
      }
    } else if (url.pathname === '/api/validation') {
      const id = integer(url.searchParams.get('id')),
        source = url.searchParams.get('source');
      if (source !== 'n2yo' && source !== 'wheretheiss')
        throw new HttpError('Fuente inválida.', 400);
      const o: Observer = {
        latitude: numeric(url.searchParams.get('lat'), -90, 90),
        longitude: numeric(url.searchParams.get('lon'), -180, 180),
        altitude: numeric(url.searchParams.get('alt'), -500, 20000),
        name: 'Observador',
        source: 'manual',
      };
      const key = `${source}:${id}:${o.latitude}:${o.longitude}:${o.altitude}`;
      const cached = validationCache.get(key);
      if (cached && cached.until > Date.now()) result = cached.value;
      else {
        let job = validationJobs.get(key);
        if (!job) {
          job = (
            source === 'n2yo' ? n2yo.getValidationPosition(id, o) : iss.getValidationPosition(id)
          )
            .then((value) => {
              validationCache.set(key, { until: Date.now() + 10_000, value });
              return value;
            })
            .finally(() => validationJobs.delete(key));
          validationJobs.set(key, job);
        }
        result = await job;
      }
    } else throw new HttpError('Endpoint inexistente.', 404);
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 503;
    // Provider errors are deliberately sanitized in ProviderHttp.
    res.writeHead(status === 429 ? 429 : status >= 400 && status < 500 ? status : 503);
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Proveedor no disponible.' }));
  }
});
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '0.0.0.0', () =>
  console.log('Satellite Tracker API en puerto ' + (process.env.PORT || 3001)),
);

import type {
  CatalogGroup,
  DataProvider,
  OrbitalObject,
  OmmElements,
  Observer,
  ValidationPosition,
  ProviderId,
} from '../core/types';
import { ProviderHttp } from './http';
const unsupported = () => {
  throw new Error('Operación no soportada por este proveedor.');
};
export function parseOmm(
  data: unknown,
  group: CatalogGroup,
  source: ProviderId,
  supplemental = false,
): OrbitalObject[] {
  if (!Array.isArray(data)) throw new Error('El proveedor no devolvió un catálogo OMM.');
  const byId = new Map<number, OrbitalObject>();
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const o = { ...raw } as OmmElements;
    const required = [
      'NORAD_CAT_ID',
      'MEAN_MOTION',
      'ECCENTRICITY',
      'INCLINATION',
      'RA_OF_ASC_NODE',
      'ARG_OF_PERICENTER',
      'MEAN_ANOMALY',
    ];
    if (required.some((k) => o[k] === undefined || !Number.isFinite(Number(o[k])))) continue;
    for (const k of [...required, 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT'])
      o[k] = Number(o[k] ?? 0);
    if (
      !Number.isInteger(o.NORAD_CAT_ID) ||
      o.NORAD_CAT_ID <= 0 ||
      o.MEAN_MOTION <= 0 ||
      o.ECCENTRICITY < 0 ||
      o.ECCENTRICITY >= 1
    )
      continue;
    const epoch = String(o.EPOCH).replace(/Z$/, '') + 'Z';
    if (!Number.isFinite(Date.parse(epoch))) continue;
    const object: OrbitalObject = {
      id: o.NORAD_CAT_ID,
      name: String(o.OBJECT_NAME || `NORAD ${o.NORAD_CAT_ID}`),
      group,
      epoch,
      format: 'OMM',
      omm: o,
      source,
      supplemental,
    };
    const previous = byId.get(object.id),
      now = Date.now(),
      nextEpoch = Date.parse(epoch),
      prevEpoch = previous ? Date.parse(previous.epoch) : 0;
    // SupGP can contain consecutive fitted arcs. Prefer the newest arc already
    // started; if every arc is future-dated, use the nearest future epoch.
    if (
      !previous ||
      (nextEpoch <= now && (prevEpoch > now || nextEpoch > prevEpoch)) ||
      (nextEpoch > now && prevEpoch > now && nextEpoch < prevEpoch)
    )
      byId.set(object.id, object);
  }
  if (!byId.size) throw new Error('No hay elementos orbitales válidos en la respuesta.');
  return [...byId.values()];
}
export function parseTle(
  name: string,
  tle: string,
  group: CatalogGroup,
  source: ProviderId,
  expectedId?: number,
): OrbitalObject {
  const lines = tle
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const a = lines.find((s) => s.startsWith('1 ')),
    b = lines.find((s) => s.startsWith('2 '));
  if (!a || !b || a.length < 68 || b.length < 68) throw new Error('TLE incompleto.');
  const yy = Number(a.slice(18, 20)),
    year = yy < 57 ? 2000 + yy : 1900 + yy;
  const epoch = new Date(
    Date.UTC(year, 0, 1) + (Number(a.slice(20, 32)) - 1) * 86400_000,
  ).toISOString();
  const id = expectedId || Number(a.slice(2, 7));
  if (!Number.isFinite(id)) throw new Error('NORAD ID inválido en el TLE.');
  return { id, name, group, source, epoch, format: 'TLE', tle: [a, b] };
}
export class CelesTrakProvider implements DataProvider {
  id = 'celestrak' as const;
  constructor(private http: ProviderHttp) {}
  async getCatalog(group: CatalogGroup) {
    const sup = group === 'starlink';
    const url = sup
      ? 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=JSON'
      : `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=JSON`;
    try {
      return parseOmm(await this.http.request(url), group, this.id, sup);
    } catch (error) {
      if (!sup) throw error;
      // Standard GP is a distinct fallback dataset, clearly identified in UI.
      return parseOmm(
        await this.http.request(
          'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=JSON',
        ),
        group,
        this.id,
        false,
      );
    }
  }
  async getOrbitalData(id: number, group: CatalogGroup = 'stations') {
    return parseOmm(
      await this.http.request(
        `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=JSON`,
      ),
      group,
      this.id,
    )[0];
  }
  async getValidationPosition(): Promise<ValidationPosition> {
    return unsupported();
  }
}
export class SpaceTrackProvider implements DataProvider {
  id = 'spacetrack' as const;
  private cookie = '';
  private expires = 0;
  constructor(
    private http: ProviderHttp,
    private identity: string,
    private password: string,
  ) {}
  private async auth() {
    if (this.cookie && this.expires > Date.now()) return;
    // Login is also rate limited. Cookies are kept only in server memory.
    await this.http.request<string>(
      'https://www.space-track.org/ajaxauth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ identity: this.identity, password: this.password }).toString(),
      },
      'text',
      (response) => {
        const headers = response.headers as Headers & { getSetCookie?: () => string[] };
        const cookies = headers.getSetCookie?.() || [headers.get('set-cookie') || ''];
        this.cookie = cookies
          .map((c) => c.split(';')[0])
          .filter(Boolean)
          .join('; ');
      },
    );
    if (!this.cookie) throw new Error('Space-Track no pudo iniciar sesión.');
    this.expires = Date.now() + 20 * 60_000;
  }
  private async query(path: string, group: CatalogGroup) {
    if (!this.identity || !this.password)
      throw new Error('Space-Track requiere credenciales en el servidor.');
    await this.auth();
    try {
      return parseOmm(
        await this.http.request(`https://www.space-track.org/basicspacedata/query/${path}`, {
          headers: { Cookie: this.cookie },
        }),
        group,
        this.id,
      );
    } catch (e) {
      this.expires = 0;
      this.cookie = '';
      throw e;
    }
  }
  async getCatalog(group: CatalogGroup) {
    const queries: Record<CatalogGroup, string> = {
      stations: 'NORAD_CAT_ID/25544,48274',
      starlink: 'OBJECT_NAME/~~STARLINK',
      'gps-ops': 'OBJECT_NAME/~~NAVSTAR',
      weather: 'OBJECT_NAME/~~NOAA',
      geo: 'MEAN_MOTION/0.99--1.01',
    };
    return this.query(
      `class/gp/${queries[group]}/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json`,
      group,
    );
  }
  async getOrbitalData(id: number, group: CatalogGroup = 'stations') {
    return (await this.query(`class/gp/NORAD_CAT_ID/${id}/format/json`, group))[0];
  }
  async getValidationPosition(): Promise<ValidationPosition> {
    return unsupported();
  }
}
export class N2yoProvider implements DataProvider {
  id = 'n2yo' as const;
  constructor(
    private http: ProviderHttp,
    private key: string,
  ) {}
  private url(path: string) {
    if (!this.key) throw new Error('N2YO requiere N2YO_API_KEY en el servidor.');
    return `https://api.n2yo.com/rest/v1/satellite/${path}&apiKey=${encodeURIComponent(this.key)}`;
  }
  async getCatalog(): Promise<OrbitalObject[]> {
    return unsupported();
  }
  async getOrbitalData(id: number, group: CatalogGroup = 'stations') {
    const data = await this.http.request<{ info: { satname: string }; tle: string }>(
      this.url(`tle/${id}`),
    );
    return parseTle(data.info.satname, data.tle, group, this.id, id);
  }
  async getValidationPosition(id: number, o: Observer): Promise<ValidationPosition> {
    const data = await this.http.request<{
      positions: {
        satlatitude: number;
        satlongitude: number;
        sataltitude: number;
        timestamp: number;
        azimuth: number;
        elevation: number;
      }[];
    }>(this.url(`positions/${id}/${o.latitude}/${o.longitude}/${o.altitude}/1`));
    const p = data.positions?.[0];
    if (!p || !Number.isFinite(p.timestamp)) throw new Error('N2YO no devolvió una posición.');
    return {
      latitude: p.satlatitude,
      longitude: p.satlongitude,
      altitude: p.sataltitude,
      time: p.timestamp * 1000,
      azimuth: p.azimuth,
      elevation: p.elevation,
      source: this.id,
    };
  }
}
export class WhereTheIssProvider implements DataProvider {
  id = 'wheretheiss' as const;
  constructor(private http: ProviderHttp) {}
  async getCatalog(): Promise<OrbitalObject[]> {
    return unsupported();
  }
  async getOrbitalData(id: number, group: CatalogGroup = 'stations') {
    if (id !== 25544) throw new Error('Where the ISS at? solo admite la ISS (25544).');
    const d = await this.http.request<{ line1: string; line2: string }>(
      'https://api.wheretheiss.at/v1/satellites/25544/tles',
    );
    return parseTle('ISS (ZARYA)', `${d.line1}\n${d.line2}`, group, this.id, 25544);
  }
  async getValidationPosition(id: number): Promise<ValidationPosition> {
    if (id !== 25544) throw new Error('Where the ISS at? solo admite la ISS (25544).');
    const p = await this.http.request<{
      latitude: number;
      longitude: number;
      altitude: number;
      timestamp: number;
    }>('https://api.wheretheiss.at/v1/satellites/25544');
    if (!Number.isFinite(p.timestamp) || !Number.isFinite(p.latitude))
      throw new Error('Posición ISS inválida.');
    return { ...p, time: p.timestamp * 1000, source: this.id };
  }
}

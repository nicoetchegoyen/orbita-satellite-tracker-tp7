import { describe, it, expect } from 'vitest';
import {
  orbitalPosition,
  orbitalPeriod,
  satelliteRecord,
  groundTrack,
  positionError,
} from '../src/core/orbital';
import { footprintRadius, splitAntimeridian, polarPoint, haversine } from '../src/core/geo';
import { predictPasses } from '../src/core/prediction';
import { parseTle, parseOmm } from '../src/data/providers';
import { DEFAULT_SETTINGS } from '../src/core/types';
import type { OrbitalObject, GeoPoint } from '../src/core/types';
import snapshot from '../assets/catalog-snapshot.json';
import { sgp4 } from 'satellite.js';
const observer = DEFAULT_SETTINGS.observer;
const iss = (snapshot as OrbitalObject[]).find((o) => o.id === 25544)!;
const epoch = Date.parse(iss.epoch);
describe('SGP4 y geometría', () => {
  it('reproduce el vector de verificación Vallado 00005 en su epoch (km)', () => {
    const sat = parseTle(
      'VANGUARD 1',
      '1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753\n2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667',
      'stations',
      'celestrak',
    );
    const p = sgp4(satelliteRecord(sat), 0)!;
    expect(p.position.x).toBeCloseTo(7022.46529266, 4);
    expect(p.position.y).toBeCloseTo(-1400.08296755, 4);
    expect(p.position.z).toBeCloseTo(0.03995155, 4);
    const dated = orbitalPosition(sat, Date.parse(sat.epoch), observer);
    // JS Date rounds the fractional epoch to milliseconds; at orbital speed
    // this introduces up to ~8 m of along-track error.
    expect(
      Math.hypot(
        dated.eci.x - p.position.x,
        dated.eci.y - p.position.y,
        dated.eci.z - p.position.z,
      ),
    ).toBeLessThan(0.008);
  });
  it('propaga ISS en LEO y calcula topocéntricas finitas', () => {
    const p = orbitalPosition(iss, epoch, observer);
    expect(p.altitude).toBeGreaterThan(300);
    expect(p.altitude).toBeLessThan(500);
    expect(p.velocity).toBeGreaterThan(7);
    expect(p.velocity).toBeLessThan(8);
    expect(p.azimuth).toBeGreaterThanOrEqual(0);
    expect(p.azimuth).toBeLessThan(360);
    expect(p.range).toBeGreaterThan(0);
    expect(p.observerSunElevation).toBeGreaterThanOrEqual(-90);
    expect(p.observerSunElevation).toBeLessThanOrEqual(90);
    expect(orbitalPeriod(iss) / 60000).toBeGreaterThan(85);
    expect(orbitalPeriod(iss) / 60000).toBeLessThan(100);
  });
  it('soporta OMM con ID de seis dígitos sin convertir a TLE', () => {
    const object = parseOmm(
      [{ ...iss.omm, NORAD_CAT_ID: 123456, OBJECT_NAME: 'PRUEBA OMM' }],
      'starlink',
      'celestrak',
    )[0];
    expect(object.id).toBe(123456);
    expect(orbitalPosition(object, epoch, observer).altitude).toBeGreaterThan(300);
  });
  it('acepta EPOCH con y sin Z y descarta registros corruptos', () => {
    const [o] = parseOmm(
      [
        { ...iss.omm, EPOCH: iss.epoch },
        { ...iss.omm, NORAD_CAT_ID: 'bad' },
      ],
      'stations',
      'celestrak',
    );
    expect(o.epoch).toBe(iss.epoch);
    expect(() => parseOmm([{ ...iss.omm, MEAN_MOTION: 0 }], 'stations', 'celestrak')).toThrow();
  });
  it('usa propagación de espacio profundo para GEO y MEO', () => {
    for (const group of ['geo', 'gps-ops']) {
      const object = (snapshot as OrbitalObject[]).find((o) => o.group === group)!;
      expect(satelliteRecord(object).method).toBe('d');
      const p = orbitalPosition(object, Date.parse(object.epoch), observer);
      expect(p.altitude).toBeGreaterThan(10000);
    }
  });
  it('corta en ambos sentidos del antimeridiano con intersección exacta', () => {
    const point = (longitude: number, time: number): GeoPoint => ({
      longitude,
      latitude: 0,
      altitude: 400,
      time,
    });
    for (const pair of [
      [179, -179],
      [-179, 179],
    ]) {
      const s = splitAntimeridian([point(pair[0], 0), point(pair[1], 2000)]);
      expect(s.length).toBe(2);
      expect(Math.abs(s[0].at(-1)!.longitude)).toBe(180);
      expect(s[1][0].time).toBe(1000);
      for (const segment of s)
        for (let i = 1; i < segment.length; i++)
          expect(Math.abs(segment[i].longitude - segment[i - 1].longitude)).toBeLessThanOrEqual(
            180,
          );
    }
  });
  it('el ground track contiene al menos una órbita completa futura sin líneas transmundiales', () => {
    const t = groundTrack(iss, epoch, observer);
    const future = t.future.flat();
    expect(future.at(-1)!.time - future[0].time).toBeGreaterThanOrEqual(orbitalPeriod(iss) - 1);
    for (const s of [...t.future, ...t.past])
      for (let i = 1; i < s.length; i++)
        expect(Math.abs(s[i].longitude - s[i - 1].longitude)).toBeLessThanOrEqual(180);
  });
  it('el footprint decrece al aumentar la elevación mínima', () => {
    expect(footprintRadius(400, 0)).toBeGreaterThan(footprintRadius(400, 10));
    expect(footprintRadius(400, 90)).toBeCloseTo(0, 10);
    expect(footprintRadius(0, 0)).toBe(0);
  });
  it('polar: norte arriba, este a la derecha y cenit al centro', () => {
    expect(polarPoint(0, 0)).toEqual({ x: 160, y: 30 });
    expect(polarPoint(90, 0).x).toBe(290);
    expect(polarPoint(32, 90)).toEqual({ x: 160, y: 160 });
  });
  it('error 3D usa altitud y no solo la distancia de superficie', () => {
    const a = { time: 0, latitude: 0, longitude: 0, altitude: 400 };
    const b = { ...a, altitude: 401 };
    expect(positionError(a, b)).toBeCloseTo(1, 8);
    expect(haversine(a, b)).toBe(0);
  });
});
describe('predicción por refinamiento', () => {
  it('AOS y LOS cruzan la máscara con precisión subsegundo; TCA es un máximo', async () => {
    const passes = await predictPasses(iss, observer, epoch, 24, 10);
    expect(passes.length).toBeGreaterThan(0);
    for (const p of passes) {
      expect(p.aos).toBeLessThan(p.tca);
      expect(p.tca).toBeLessThan(p.los);
      if (!p.ongoing) {
        expect(orbitalPosition(iss, p.aos - 1000, observer).elevation).toBeLessThan(10);
        expect(orbitalPosition(iss, p.aos + 1000, observer).elevation).toBeGreaterThan(10);
      }
      if (!p.continuous) {
        expect(orbitalPosition(iss, p.los - 1000, observer).elevation).toBeGreaterThan(10);
        expect(orbitalPosition(iss, p.los + 1000, observer).elevation).toBeLessThan(10);
      }
      expect(p.maxElevation).toBeGreaterThanOrEqual(
        orbitalPosition(iss, p.tca + 1000, observer).elevation - 0.001,
      );
      expect(p.samples.length).toBeGreaterThan(2);
    }
  });
  it('no pierde un pase rasante con duración menor al paso grueso', async () => {
    const broad = await predictPasses(iss, observer, epoch, 24, 0);
    const p = broad.find((p) => !p.ongoing && !p.continuous)!;
    const narrow = await predictPasses(iss, observer, p.tca - 5 * 60_000, 1, p.maxElevation - 0.02);
    expect(narrow.length).toBeGreaterThan(0);
    expect(narrow[0].los - narrow[0].aos).toBeLessThan(60_000);
  });
  it('cancelación detiene la búsqueda', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(predictPasses(iss, observer, epoch, 72, 10, controller.signal)).rejects.toThrow();
  });
  it('GEO continuo no crea AOS o LOS falsos', async () => {
    const geo = (snapshot as OrbitalObject[]).find((o) => o.group === 'geo')!;
    const t = Date.parse(geo.epoch),
      pos = orbitalPosition(geo, t, observer),
      sub = { ...observer, latitude: 0, longitude: pos.longitude };
    const passes = await predictPasses(geo, sub, t, 24, 5);
    expect(passes).toHaveLength(1);
    expect(passes[0].ongoing).toBe(true);
    expect(passes[0].continuous).toBe(true);
  });
});

import {
  json2satrec,
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  eciToEcf,
  ecfToLookAngles,
  geodeticToEcf,
  radiansToDegrees,
  sunPos,
  jday,
} from 'satellite.js';
import type { SatRec, OMMJsonObject } from 'satellite.js';
import { DEG, EARTH_RADIUS, normalizeDegrees, normalizeLongitude, splitAntimeridian } from './geo';
import type { OrbitalObject, Observer, SatellitePosition, GeoPoint } from './types';

const records = new Map<string, SatRec>();
export function satelliteRecord(object: OrbitalObject): SatRec {
  const key = `${object.id}:${object.epoch}:${object.source}:${object.format}:${object.omm ? JSON.stringify(object.omm) : object.tle?.join('')}`;
  let rec = records.get(key);
  if (!rec) {
    rec = object.omm
      ? json2satrec(object.omm as unknown as OMMJsonObject)
      : object.tle
        ? twoline2satrec(...object.tle)
        : undefined;
    if (!rec || rec.error) throw new Error(`Elementos inválidos para ${object.name}`);
    if (records.size > 500) records.clear();
    records.set(key, rec);
  }
  return rec;
}
export function orbitalPeriod(object: OrbitalObject) {
  return ((2 * Math.PI) / satelliteRecord(object).no) * 60_000;
}
export function orbitalPosition(
  object: OrbitalObject,
  time: number,
  observer: Observer,
): SatellitePosition {
  const date = new Date(time),
    rec = satelliteRecord(object),
    pv = propagate(rec, date);
  if (!pv)
    throw new Error(`No se puede propagar ${object.name} (SGP4 ${rec.error}; posible reentrada).`);
  const gmst = gstime(date),
    gd = eciToGeodetic(pv.position, gmst);
  const observerGd = {
    latitude: observer.latitude * DEG,
    longitude: observer.longitude * DEG,
    height: observer.altitude / 1000,
  };
  const look = ecfToLookAngles(observerGd, eciToEcf(pv.position, gmst));
  const sunVector = sunPos(jday(date)).rsun;
  const sun = { x: sunVector[0], y: sunVector[1], z: sunVector[2] };
  const sunLength = Math.hypot(sun.x, sun.y, sun.z);
  const projection =
    (pv.position.x * sun.x + pv.position.y * sun.y + pv.position.z * sun.z) / sunLength;
  const perpendicular = Math.sqrt(
    Math.max(0, pv.position.x ** 2 + pv.position.y ** 2 + pv.position.z ** 2 - projection ** 2),
  );
  // Cylindrical umbra; no penumbra or refraction correction.
  const sunlit = !(projection < 0 && perpendicular < EARTH_RADIUS);
  // sunPos is in AU; scale before topocentric conversion (km).
  const AU = 149597870.7;
  const sunEcf = eciToEcf({ x: sun.x * AU, y: sun.y * AU, z: sun.z * AU }, gmst);
  const sunLook = ecfToLookAngles(observerGd, sunEcf);
  return {
    time,
    latitude: radiansToDegrees(gd.latitude),
    longitude: normalizeLongitude(radiansToDegrees(gd.longitude)),
    altitude: gd.height,
    velocity: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    azimuth: normalizeDegrees(radiansToDegrees(look.azimuth)),
    elevation: radiansToDegrees(look.elevation),
    range: look.rangeSat,
    sunlit,
    observerSunElevation: radiansToDegrees(sunLook.elevation),
    eci: pv.position,
  };
}
export function groundTrack(object: OrbitalObject, time: number, observer: Observer) {
  const period = orbitalPeriod(object);
  // Half an orbit into the past, one full orbit into the future, <=60 s sampling.
  const start = time - period / 2,
    end = time + period;
  const points: GeoPoint[] = [];
  for (let t = start; t <= end; t += 60_000) points.push(orbitalPosition(object, t, observer));
  points.push(orbitalPosition(object, end, observer));
  return {
    past: splitAntimeridian(
      points.filter((p) => p.time < time).concat([orbitalPosition(object, time, observer)]),
    ),
    future: splitAntimeridian([
      orbitalPosition(object, time, observer),
      ...points.filter((p) => p.time > time),
    ]),
  };
}
export function positionError(a: GeoPoint, b: GeoPoint) {
  const toEcf = (p: GeoPoint) =>
    geodeticToEcf({ latitude: p.latitude * DEG, longitude: p.longitude * DEG, height: p.altitude });
  const x = toEcf(a),
    y = toEcf(b);
  return Math.hypot(x.x - y.x, x.y - y.y, x.z - y.z);
}
export function opticalVisible(p: SatellitePosition) {
  return p.sunlit && p.observerSunElevation <= -6 && p.elevation > 0;
}

import type { GeoPoint } from './types';
export const EARTH_RADIUS = 6378.137;
export const DEG = Math.PI / 180;
export const normalizeLongitude = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180;
export const normalizeDegrees = (n: number) => ((n % 360) + 360) % 360;

/** Interpolate the dateline crossing so neither adjacent segment spans the world. */
export function splitAntimeridian(points: GeoPoint[]): GeoPoint[][] {
  if (!points.length) return [];
  const segments: GeoPoint[][] = [[points[0]]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (Math.abs(b.longitude - a.longitude) > 180) {
      const adjusted = b.longitude + (b.longitude < a.longitude ? 360 : -360);
      const edge = a.longitude > 0 ? 180 : -180;
      const f = (edge - a.longitude) / (adjusted - a.longitude);
      const cross = {
        latitude: a.latitude + (b.latitude - a.latitude) * f,
        longitude: edge,
        altitude: a.altitude + (b.altitude - a.altitude) * f,
        time: a.time + (b.time - a.time) * f,
      };
      segments[segments.length - 1].push(cross);
      segments.push([{ ...cross, longitude: -edge }, b]);
    } else segments[segments.length - 1].push(b);
  }
  return segments.filter((s) => s.length > 1);
}

/** Spherical cap with an elevation mask, not a flat circle in degrees. */
export function footprintRadius(altitudeKm: number, minElevationDeg: number) {
  const e = minElevationDeg * DEG;
  return Math.max(
    0,
    Math.acos((EARTH_RADIUS / (EARTH_RADIUS + Math.max(0, altitudeKm))) * Math.cos(e)) - e,
  );
}
export function footprint(point: GeoPoint, minElevation: number, count = 120): GeoPoint[] {
  const r = footprintRadius(point.altitude, minElevation),
    lat = point.latitude * DEG,
    lon = point.longitude * DEG;
  return Array.from({ length: count + 1 }, (_, i) => {
    const b = (i / count) * Math.PI * 2;
    const p = Math.asin(Math.sin(lat) * Math.cos(r) + Math.cos(lat) * Math.sin(r) * Math.cos(b));
    const l =
      lon +
      Math.atan2(
        Math.sin(b) * Math.sin(r) * Math.cos(lat),
        Math.cos(r) - Math.sin(lat) * Math.sin(p),
      );
    return { ...point, latitude: p / DEG, longitude: normalizeLongitude(l / DEG) };
  });
}
export function haversine(
  a: Pick<GeoPoint, 'latitude' | 'longitude'>,
  b: Pick<GeoPoint, 'latitude' | 'longitude'>,
) {
  const dLat = (b.latitude - a.latitude) * DEG,
    dLon = (b.longitude - a.longitude) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * DEG) * Math.cos(b.latitude * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function polarPoint(azimuth: number, elevation: number, radius = 130, center = 160) {
  const r = (radius * (90 - Math.max(0, Math.min(90, elevation)))) / 90;
  return { x: center + r * Math.sin(azimuth * DEG), y: center - r * Math.cos(azimuth * DEG) };
}

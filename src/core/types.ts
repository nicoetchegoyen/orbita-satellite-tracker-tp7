export const GROUPS = ['stations', 'starlink', 'gps-ops', 'weather', 'geo'] as const;
export type CatalogGroup = (typeof GROUPS)[number];
export type ProviderId = 'celestrak' | 'spacetrack' | 'n2yo' | 'wheretheiss' | 'proxy';
export interface OmmElements {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  [key: string]: unknown;
}
export interface OrbitalObject {
  id: number;
  name: string;
  group: CatalogGroup;
  epoch: string;
  source: ProviderId;
  format: 'OMM' | 'TLE';
  omm?: OmmElements;
  tle?: [string, string];
  supplemental?: boolean;
}
export interface Observer {
  latitude: number;
  longitude: number;
  altitude: number;
  name: string;
  source: 'gps' | 'manual';
}
export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  time: number;
}
export interface SatellitePosition extends GeoPoint {
  azimuth: number;
  elevation: number;
  range: number;
  velocity: number;
  sunlit: boolean;
  observerSunElevation: number;
  eci: { x: number; y: number; z: number };
}
export interface PassSample {
  time: number;
  azimuth: number;
  elevation: number;
  optical: boolean;
}
export interface SatellitePass {
  id: string;
  satelliteId: number;
  aos: number;
  tca: number;
  los: number;
  maxElevation: number;
  aosAzimuth: number;
  losAzimuth: number;
  samples: PassSample[];
  optical: boolean;
  ongoing: boolean;
  continuous: boolean;
  opticalWindows: { start: number; end: number }[];
}
export interface ValidationPosition extends GeoPoint {
  source: 'n2yo' | 'wheretheiss';
  azimuth?: number;
  elevation?: number;
}
export interface ValidationResult {
  id: string;
  satelliteId: number;
  name: string;
  source: string;
  time: number;
  orbitalEpoch: string;
  orbitalAgeHours: number;
  errorKm: number;
  groundErrorKm: number;
  altitudeErrorKm: number;
  local: GeoPoint;
  reference: ValidationPosition;
}
export interface CatalogResult {
  objects: OrbitalObject[];
  fetchedAt: number;
  provider: string;
  stale: boolean;
  bundled?: boolean;
  warnings: string[];
}
export interface DataProvider {
  id: ProviderId;
  getCatalog(group: CatalogGroup): Promise<OrbitalObject[]>;
  getOrbitalData(id: number, group?: CatalogGroup): Promise<OrbitalObject>;
  getValidationPosition(id: number, observer: Observer): Promise<ValidationPosition>;
}
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface Settings {
  observer: Observer;
  minElevation: number;
  leadMinutes: number;
  horizonHours: number;
  constellationLimit: number;
  opticalOnly: boolean;
  backgroundEnabled: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  observer: {
    latitude: -34.6037,
    longitude: -58.3816,
    altitude: 25,
    name: 'Buenos Aires',
    source: 'manual',
  },
  minElevation: 10,
  leadMinutes: 5,
  horizonHours: 48,
  constellationLimit: 40,
  opticalOnly: false,
  backgroundEnabled: false,
};

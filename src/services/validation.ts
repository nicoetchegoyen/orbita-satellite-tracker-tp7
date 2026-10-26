import type { Observer, OrbitalObject, ValidationResult } from '../core/types';
import { orbitalPosition, positionError } from '../core/orbital';
import { haversine } from '../core/geo';
import { validationPosition } from '../data/client';
export async function validatePosition(
  object: OrbitalObject,
  observer: Observer,
  source: 'n2yo' | 'wheretheiss',
): Promise<ValidationResult> {
  const reference = await validationPosition(object.id, source, observer);
  if (
    ![reference.latitude, reference.longitude, reference.altitude, reference.time].every(
      Number.isFinite,
    )
  )
    throw new Error('La fuente de validación devolvió valores inválidos.');
  // Propagate at the reference timestamp, never at request arrival time.
  const local = orbitalPosition(object, reference.time, observer);
  return {
    id: `${source}-${reference.time}`,
    satelliteId: object.id,
    name: object.name,
    source,
    time: reference.time,
    orbitalEpoch: object.epoch,
    orbitalAgeHours: (reference.time - Date.parse(object.epoch)) / 3600_000,
    errorKm: positionError(local, reference),
    groundErrorKm: haversine(local, reference),
    altitudeErrorKm: Math.abs(local.altitude - reference.altitude),
    local,
    reference,
  };
}

import { orbitalPosition, orbitalPeriod, opticalVisible } from './orbital';
import type { OrbitalObject, Observer, SatellitePass, PassSample } from './types';

export class PredictionCancelled extends Error {}
const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0));
export function refineCrossing(
  fn: (time: number) => number,
  a: number,
  b: number,
  rising: boolean,
) {
  for (let i = 0; i < 18 && b - a > 250; i++) {
    const m = (a + b) / 2;
    if (fn(m) >= 0 === rising) b = m;
    else a = m;
  }
  return (a + b) / 2;
}
export function maximize(fn: (time: number) => number, a: number, b: number) {
  const k = (Math.sqrt(5) - 1) / 2;
  let c = b - k * (b - a),
    d = a + k * (b - a),
    fc = fn(c),
    fd = fn(d);
  for (let i = 0; i < 35 && b - a > 250; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - k * (b - a);
      fc = fn(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + k * (b - a);
      fd = fn(d);
    }
  }
  return (a + b) / 2;
}

export async function predictPasses(
  object: OrbitalObject,
  observer: Observer,
  start: number,
  hours = 48,
  minElevation = 10,
  signal?: AbortSignal,
): Promise<SatellitePass[]> {
  if (minElevation < 0 || minElevation >= 90)
    throw new Error('La elevación debe estar entre 0° y 89°.');
  const end = start + hours * 3600_000;
  const position = (t: number) => orbitalPosition(object, t, observer);
  const score = (t: number) => position(t).elevation - minElevation;
  // 60 s coarse scan; refine every local maximum, including grazing passes whose
  // endpoints are both below the mask. Yield regularly to keep the RN JS UI fluid.
  const nodes: { time: number; value: number }[] = [];
  for (let t = start, i = 0; t <= end; t += 60_000, i++) {
    if (signal?.aborted) throw new PredictionCancelled();
    nodes.push({ time: t, value: score(t) });
    if (i % 80 === 79) await yieldFrame();
  }
  if (nodes[nodes.length - 1].time < end) nodes.push({ time: end, value: score(end) });
  // Add refined peaks before scanning sign transitions. Captures arbitrarily
  // brief grazing windows near the elevation threshold at a local maximum.
  const extra: typeof nodes = [];
  for (let i = 1; i < nodes.length - 1; i++) {
    if (nodes[i].value > nodes[i - 1].value && nodes[i].value >= nodes[i + 1].value) {
      const t = maximize(score, nodes[i - 1].time, nodes[i + 1].time);
      extra.push({ time: t, value: score(t) });
    }
  }
  const all = [...nodes, ...extra].sort((a, b) => a.time - b.time);
  const windows: { aos: number; los: number; ongoing: boolean; continuous: boolean }[] = [];
  let aos: number | null = all[0].value >= 0 ? start : null;
  let ongoing = aos !== null;
  for (let i = 1; i < all.length; i++) {
    const a = all[i - 1],
      b = all[i];
    if (a.value < 0 && b.value >= 0) {
      aos = refineCrossing(score, a.time, b.time, true);
      ongoing = false;
    }
    if (a.value >= 0 && b.value < 0 && aos !== null) {
      windows.push({
        aos,
        los: refineCrossing(score, a.time, b.time, false),
        ongoing,
        continuous: false,
      });
      aos = null;
    }
  }
  if (aos !== null) windows.push({ aos, los: end, ongoing, continuous: true });
  const result: SatellitePass[] = [];
  for (const w of windows) {
    if (signal?.aborted) throw new PredictionCancelled();
    // GEO can stay above the mask for the entire search. Find the best coarse
    // sample first so multi-day intervals do not assume a unimodal curve.
    const candidates = all.filter((n) => n.time >= w.aos && n.time <= w.los);
    const best = candidates.reduce((a, b) => (a.value > b.value ? a : b), {
      time: w.aos,
      value: score(w.aos),
    });
    const tca = maximize(
      score,
      Math.max(w.aos, best.time - 60_000),
      Math.min(w.los, best.time + 60_000),
    );
    const samples: PassSample[] = [];
    const sampleStep = Math.max(10_000, (w.los - w.aos) / 360);
    for (let t = w.aos; t < w.los; t += sampleStep) {
      const p = position(t);
      samples.push({
        time: t,
        azimuth: p.azimuth,
        elevation: p.elevation,
        optical: opticalVisible(p),
      });
    }
    for (const t of [tca, w.los]) {
      const p = position(t);
      samples.push({
        time: t,
        azimuth: p.azimuth,
        elevation: p.elevation,
        optical: opticalVisible(p),
      });
    }
    samples.sort((a, b) => a.time - b.time);
    const opticalWindows: SatellitePass['opticalWindows'] = [];
    let opticalStart: number | null = null;
    for (const sample of samples) {
      if (sample.optical && opticalStart === null) opticalStart = sample.time;
      if (!sample.optical && opticalStart !== null) {
        opticalWindows.push({ start: opticalStart, end: sample.time });
        opticalStart = null;
      }
    }
    if (opticalStart !== null) opticalWindows.push({ start: opticalStart, end: w.los });
    result.push({
      id: `${object.id}-${Math.round(w.aos / 1000)}`,
      satelliteId: object.id,
      ...w,
      tca,
      maxElevation: position(tca).elevation,
      aosAzimuth: position(w.aos).azimuth,
      losAzimuth: position(w.los).azimuth,
      optical: samples.some((s) => s.optical),
      opticalWindows,
      samples,
    });
    await yieldFrame();
  }
  return result;
}

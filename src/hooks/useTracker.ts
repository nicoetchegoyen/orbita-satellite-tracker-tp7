import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type {
  CatalogGroup,
  CatalogResult,
  OrbitalObject,
  SatellitePosition,
  SatellitePass,
  Settings,
} from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { loadCatalog, loadObject } from '../data/client';
import { orbitalPosition, groundTrack } from '../core/orbital';
import { predictPasses, PredictionCancelled } from '../core/prediction';
import { readSettings, writeSettings } from '../services/settings';
import { configureBackground } from '../services/background';
import { refreshReminders } from '../services/reminders';
import snapshot from '../../assets/catalog-snapshot.json';
const initial = (snapshot as OrbitalObject[]).find((o) => o.id === 25544) || null;
export function useTracker() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS),
    [ready, setReady] = useState(false);
  const [group, setGroup] = useState<CatalogGroup>('stations'),
    [catalog, setCatalog] = useState<CatalogResult | null>(null);
  const [selected, setSelected] = useState<OrbitalObject | null>(initial),
    [position, setPosition] = useState<SatellitePosition | null>(null);
  const [now, setNow] = useState(Date.now()),
    [passes, setPasses] = useState<SatellitePass[]>([]),
    [predicting, setPredicting] = useState(false);
  const [track, setTrack] = useState<ReturnType<typeof groundTrack>>({ past: [], future: [] });
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [constellation, setConstellation] = useState<OrbitalObject[]>([]),
    [constellationOn, setConstellationOn] = useState(false);
  const [constellationPoints, setConstellationPoints] = useState<SatellitePosition[]>([]);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const generation = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await readSettings();
      let saved: OrbitalObject | null = null;
      try {
        saved = JSON.parse((await AsyncStorage.getItem('selected-object')) || 'null');
      } catch {}
      if (!mounted) return;
      setSettings(s);
      if (saved) {
        setSelected(saved);
        setGroup(saved.group);
      }
      setReady(true);
      if (s.backgroundEnabled) configureBackground(true).catch((e) => setNotice(e.message));
    })();
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, [active]);
  const refresh = useCallback(async () => {
    const g = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await loadCatalog(group);
      if (g !== generation.current) return;
      setCatalog(result);
      setSelected((prev) =>
        prev
          ? result.objects.find((o) => o.id === prev.id) || prev
          : result.objects.find((o) => o.id === 25544) || result.objects[0],
      );
      // An exact NORAD lookup may select an object outside the filtered group.
      // Renew that object's own TTL too, rather than preserving it indefinitely.
      const previous = selectedRef.current;
      if (previous && !result.objects.some((o) => o.id === previous.id)) {
        const updated = await loadObject(previous.id, previous.group);
        if (g === generation.current && selectedRef.current?.id === previous.id)
          setSelected(updated);
      }
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.');
    } finally {
      if (g === generation.current) setLoading(false);
    }
  }, [group]);
  useEffect(() => {
    if (!ready) return;
    setCatalog(null);
    void refresh();
    const timer = setInterval(() => void refresh(), 15 * 60_000);
    return () => {
      clearInterval(timer);
      generation.current++;
    };
  }, [ready, refresh]);
  useEffect(() => {
    if (active && ready) void refresh();
  }, [active]);
  useEffect(() => {
    if (selected && ready)
      AsyncStorage.setItem('selected-object', JSON.stringify(selected)).catch(() => {});
  }, [selected, ready]);
  useEffect(() => {
    if (!selected) return;
    try {
      setPosition(orbitalPosition(selected, now, settings.observer));
    } catch (e) {
      setPosition(null);
      setError(e instanceof Error ? e.message : 'No se pudo calcular la posición.');
    }
  }, [selected, now, settings.observer]);
  const minute = Math.floor(now / 60_000);
  useEffect(() => {
    if (!selected) return;
    try {
      setTrack(groundTrack(selected, Date.now(), settings.observer));
    } catch {
      setTrack({ past: [], future: [] });
    }
  }, [selected, minute, settings.observer]);
  // Keep predictions for 15 min unless the orbital data or observing mask changes.
  const predictionBucket = Math.floor(now / (15 * 60_000));
  useEffect(() => {
    if (!selected || !ready || !active) return;
    const controller = new AbortController();
    setPredicting(true);
    setPasses([]);
    predictPasses(
      selected,
      settings.observer,
      Date.now(),
      settings.horizonHours,
      settings.minElevation,
      controller.signal,
    )
      .then((p) => {
        if (!controller.signal.aborted) setPasses(p);
      })
      .catch((e) => {
        if (!(e instanceof PredictionCancelled) && !controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPredicting(false);
      });
    return () => controller.abort();
  }, [
    selected,
    settings.observer,
    settings.horizonHours,
    settings.minElevation,
    predictionBucket,
    ready,
    active,
  ]);
  useEffect(() => {
    let mounted = true;
    if (constellationOn && !constellation.length) {
      setNotice('Cargando constelación Starlink…');
      loadCatalog('starlink')
        .then((r) => {
          if (mounted) {
            setConstellation(r.objects);
            setNotice(
              r.stale
                ? 'Starlink usa datos en caché desactualizados.'
                : 'Constelación Starlink lista.',
            );
          }
        })
        .catch((e) => {
          if (mounted) setNotice(e.message);
        });
    }
    return () => {
      mounted = false;
    };
  }, [constellationOn, constellation.length]);
  useEffect(() => {
    if (!constellationOn) {
      setConstellationPoints([]);
      return;
    }
    let stopped = false;
    const points: SatellitePosition[] = [];
    const batch = constellation.slice(0, settings.constellationLimit);
    const run = async () => {
      for (let i = 0; i < batch.length; i++) {
        if (stopped) return;
        try {
          points.push(orbitalPosition(batch[i], now, settings.observer));
        } catch {}
        if (i % 12 === 11) await new Promise((r) => setTimeout(r, 0));
      }
      if (!stopped) setConstellationPoints(points);
    };
    void run();
    return () => {
      stopped = true;
    };
  }, [constellationOn, constellation, now, settings.constellationLimit, settings.observer]);
  async function saveSettings(s: Settings) {
    if (s.backgroundEnabled !== settings.backgroundEnabled)
      await configureBackground(s.backgroundEnabled);
    await writeSettings(s);
    setSettings(s);
    setNotice('Preferencias guardadas. Los pases se recalcularán para tu ubicación.');
    refreshReminders(s).catch((e) =>
      setNotice(`Preferencias guardadas. No se pudieron renovar los avisos: ${e.message}`),
    );
  }
  async function locate() {
    try {
      setNotice('Obteniendo ubicación GPS…');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted')
        throw new Error('Sin permiso de ubicación. Podés ingresar las coordenadas en Ajustes.');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await saveSettings({
        ...settings,
        observer: {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          altitude: p.coords.altitude ?? 0,
          name: 'Mi ubicación GPS',
          source: 'gps',
        },
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo obtener tu ubicación.');
    }
  }
  async function selectById(id: number) {
    setLoading(true);
    try {
      const object = await loadObject(id, group);
      setSelected(object);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Satélite no encontrado.');
    } finally {
      setLoading(false);
    }
  }
  return {
    settings,
    saveSettings,
    ready,
    group,
    setGroup,
    catalog,
    selected,
    setSelected,
    position,
    now,
    passes: passes.filter((p) => p.los > now && (!settings.opticalOnly || p.optical)),
    predicting,
    track,
    loading,
    error,
    notice,
    setNotice,
    refresh,
    locate,
    selectById,
    constellationOn,
    setConstellationOn,
    constellationPoints,
  };
}
export type Tracker = ReturnType<typeof useTracker>;

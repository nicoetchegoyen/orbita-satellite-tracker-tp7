import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import type { Tracker } from '../hooks/useTracker';
import { C, ui, mono } from '../ui/theme';
import { Icon } from '../ui/Icon';
import { Badge, Button, Empty } from '../ui/components';
import AtlasMap from '../ui/AtlasMap';
import NativeMap from '../ui/NativeMap';
import { SkyChart } from '../ui/SkyChart';
import { time, date, countdown, coordinate, direction } from '../ui/format';
import { orbitalPeriod } from '../core/orbital';
export function Explorer({
  tracker: t,
  onCatalog,
  onPasses,
  onOrient,
}: {
  tracker: Tracker;
  onCatalog: () => void;
  onPasses: () => void;
  onOrient: () => void;
}) {
  const [showTrack, setShowTrack] = useState(true),
    [showCoverage, setShowCoverage] = useState(true),
    [native, setNative] = useState(false);
  const viewport = useWindowDimensions();
  const wide = viewport.width > 1120;
  const mapHeight = wide
    ? 362
    : Math.min(340, (viewport.width - (viewport.width >= 900 ? 294 : 42)) / 2);
  const nativeMapAvailable =
    Platform.OS === 'ios' ||
    Constants.executionEnvironment === 'storeClient' ||
    Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);
  const { position: p, selected: s } = t,
    pass = t.passes[0];
  const age = s ? (t.now - Date.parse(s.epoch)) / 3600_000 : 0;
  const mapProps = {
    position: p,
    observer: t.settings.observer,
    past: t.track.past,
    future: t.track.future,
    constellation: t.constellationPoints,
    minElevation: t.settings.minElevation,
    showTrack,
    showCoverage,
  };
  return (
    <View style={{ gap: 22 }}>
      <View style={[ui.between, { gap: 16, flexWrap: 'wrap' }]}>
        <View>
          <Text style={ui.label}>CENTRO DE SEGUIMIENTO</Text>
          <Text style={[ui.h1, { marginTop: 8 }]}>
            Tu ventana al espacio<Text style={{ color: C.lime }}>.</Text>
          </Text>
          <Text style={[ui.body, { marginTop: 6 }]}>
            Órbitas reales. Tu perspectiva desde la Tierra.
          </Text>
        </View>
        <Button label="Buscar satélite" icon="search" onPress={onCatalog} />
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
        <View style={[ui.card, { flex: 1 }]}>
          <View style={[ui.between, { padding: 18, gap: 10, flexWrap: 'wrap' }]}>
            <View style={[ui.row, { gap: 10 }]}>
              <Icon name="map" size={17} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                Órbita en tiempo real
              </Text>
            </View>
            <Badge label="CÁLCULO LOCAL · 2 S" dot />
          </View>
          <View style={{ height: mapHeight }}>
            {native ? <NativeMap {...mapProps} /> : <AtlasMap {...mapProps} />}
          </View>
          <View style={[ui.between, { padding: 14, gap: 12, flexWrap: 'wrap' }]}>
            <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
              {(
                [
                  ['Trayectoria', showTrack, () => setShowTrack(!showTrack)],
                  ['Cobertura', showCoverage, () => setShowCoverage(!showCoverage)],
                  ['Starlink', t.constellationOn, () => t.setConstellationOn(!t.constellationOn)],
                ] as [string, boolean, () => void][]
              ).map(([label, active, action]) => (
                <Pressable
                  key={label}
                  onPress={action}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.layer,
                    active && { backgroundColor: '#BBF5780D', borderColor: '#49613C' },
                  ]}
                >
                  <View style={[styles.layerDot, { backgroundColor: active ? C.lime : C.dim }]} />
                  <Text style={{ color: active ? C.text : C.dim, fontSize: 11 }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: C.dim, fontSize: 10 }}>
              {t.constellationPoints.length > 0
                ? `${t.constellationPoints.length} Starlink · `
                : ''}
              SGP4 / SDP4
            </Text>
          </View>
          {Platform.OS !== 'web' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!nativeMapAvailable) {
                  t.setNotice(
                    'El mapa Google de este build requiere GOOGLE_MAPS_API_KEY. El atlas funciona sin clave ni conexión.',
                  );
                  return;
                }
                setNative(!native);
              }}
              style={{ padding: 12, paddingTop: 0 }}
            >
              <Text style={{ color: C.blue, fontSize: 11 }}>
                {native ? 'Usar atlas sin conexión' : 'Abrir mapa nativo (Google / Apple Maps)'}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={[ui.card, { width: wide ? 294 : '100%', padding: 22, gap: 20 }]}>
          <View style={ui.between}>
            <Text style={ui.label}>SATÉLITE EN FOCO</Text>
            <Icon name="orbit" color={C.lime} size={22} />
          </View>
          <Pressable
            onPress={onCatalog}
            accessibilityRole="button"
            accessibilityLabel="Cambiar satélite"
          >
            <Text style={[ui.title, { fontSize: 25, letterSpacing: -1 }]} numberOfLines={2}>
              {s?.name || 'Seleccioná un satélite'}
            </Text>
            <View style={[ui.row, { gap: 9, marginTop: 9 }]}>
              <Text style={{ color: C.dim, fontFamily: mono, fontSize: 11 }}>
                NORAD {s?.id || '—'}
              </Text>
              <Badge
                label={p ? (p.altitude < 2000 ? 'LEO' : p.altitude < 30000 ? 'MEO' : 'GEO') : '—'}
                color={C.blue}
              />
              <Icon name="chevron" size={13} />
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: C.border }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 21 }}>
            <Metric label="ALTITUD" value={p?.altitude.toFixed(1)} unit="km" />
            <Metric label="VELOCIDAD" value={p?.velocity.toFixed(2)} unit="km/s" />
            <Metric label="LATITUD" value={p ? coordinate(p.latitude, true) : '—'} />
            <Metric label="LONGITUD" value={p ? coordinate(p.longitude, false) : '—'} />
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 13, gap: 7 }}>
            <View style={ui.between}>
              <Text style={{ color: C.muted, fontSize: 11 }}>Desde tu ubicación</Text>
              <Icon
                name="signal"
                size={14}
                color={p && p.elevation > t.settings.minElevation ? C.lime : C.dim}
              />
            </View>
            <View style={ui.between}>
              <Text style={{ color: C.text, fontFamily: mono, fontSize: 18 }}>
                {p?.azimuth.toFixed(1) || '—'}°{' '}
                <Text style={{ color: C.dim, fontSize: 11 }}>{p ? direction(p.azimuth) : ''}</Text>
              </Text>
              <Text
                style={{
                  color: p && p.elevation > 0 ? C.lime : C.muted,
                  fontFamily: mono,
                  fontSize: 18,
                }}
              >
                {p?.elevation.toFixed(1) || '—'}°{' '}
                <Text style={{ color: C.dim, fontSize: 11 }}>EL</Text>
              </Text>
            </View>
            <Text style={{ color: C.dim, fontSize: 10 }}>
              {p && p.elevation >= t.settings.minElevation
                ? 'Sobre el umbral de elevación'
                : 'Bajo el umbral de elevación'}{' '}
              · {p?.range.toFixed(0) || '—'} km
            </Text>
          </View>
          <Button label="Apuntar al satélite" icon="compass" onPress={onOrient} />
        </View>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
        <View style={[ui.card, { flex: 1, padding: 22 }]}>
          <View style={ui.between}>
            <Text style={ui.label}>TU PRÓXIMO ENCUENTRO</Text>
            <Pressable
              onPress={onPasses}
              accessibilityRole="button"
              accessibilityLabel="Ver todos los pases"
            >
              <Text style={{ color: C.lime, fontSize: 12 }}>Ver pases ↗</Text>
            </Pressable>
          </View>
          {!pass ? (
            <Empty
              title={
                t.predicting ? 'Calculando próximos pases…' : 'El cielo también tiene sus tiempos'
              }
              body={
                t.predicting
                  ? 'Buscando AOS, elevación máxima y LOS por refinamiento.'
                  : `Sin pases ${t.settings.opticalOnly ? 'ópticos ' : ''}por encima de ${t.settings.minElevation}° en las próximas ${t.settings.horizonHours} h.`
              }
              loading={t.predicting}
            />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
                marginTop: 20,
              }}
            >
              <View style={{ flex: 1, minWidth: 190, gap: 12 }}>
                <Badge
                  label={pass.optical ? 'VENTANA ÓPTICA POSIBLE' : 'PASE DE RADIO'}
                  color={pass.optical ? C.lime : C.blue}
                />
                <Text
                  style={{ color: C.text, fontSize: 33, fontWeight: '500', letterSpacing: -1.2 }}
                >
                  {time(pass.aos)}{' '}
                  <Text style={{ fontSize: 13, color: C.muted, letterSpacing: 0 }}>
                    {date(pass.aos)}
                  </Text>
                </Text>
                <Text style={ui.body}>
                  En {countdown(pass.aos - t.now)} · Máxima {pass.maxElevation.toFixed(0)}° ·{' '}
                  {direction(pass.aosAzimuth)} → {direction(pass.losAzimuth)}
                </Text>
                <View style={[ui.row, { gap: 6 }]}>
                  <View style={styles.layerDot} />
                  <Text style={{ color: C.dim, fontSize: 11 }}>
                    AOS {time(pass.aos)} · MAX {time(pass.tca)} · LOS{' '}
                    {pass.continuous ? 'fuera del rango' : time(pass.los)}
                  </Text>
                </View>
                <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <Button
                    label="Explorar este pase"
                    primary
                    icon="arrow"
                    onPress={onPasses}
                    small
                  />
                </View>
              </View>
              <View style={{ width: 170 }}>
                <SkyChart pass={pass} compact current={p} />
              </View>
            </View>
          )}
        </View>
        <View style={[ui.card, { width: wide ? 294 : '100%', padding: 22, gap: 16 }]}>
          <View style={ui.between}>
            <Text style={ui.label}>ESTADO ORBITAL</Text>
            <Icon name="check" size={18} color={age > 48 ? C.amber : C.lime} />
          </View>
          <Info
            label="Fuente"
            value={
              s
                ? `${s.source === 'celestrak' ? 'CelesTrak' : s.source}${s.supplemental ? ' · SupGP' : ''}`
                : '—'
            }
          />
          <Info label="Antigüedad del epoch" value={s ? `${Math.max(0, age).toFixed(1)} h` : '—'} />
          <Info
            label="Período orbital"
            value={s ? `${(orbitalPeriod(s) / 60_000).toFixed(1)} min` : '—'}
          />
          <Info label="Formato / caché" value={`${s?.format || '—'} / 18 h`} />
          <Text style={{ color: age > 48 ? C.amber : C.dim, fontSize: 11, lineHeight: 17 }}>
            {age > 48
              ? 'Elementos desactualizados. La precisión puede degradarse; conectate al proxy para renovarlos.'
              : 'Los elementos se renuevan con caché. Las posiciones se propagan en tu dispositivo.'}
          </Text>
        </View>
      </View>
    </View>
  );
}
function Metric({ label, value, unit }: { label: string; value?: string; unit?: string }) {
  return (
    <View style={{ width: '44%', gap: 7 }}>
      <Text style={[ui.label, { fontSize: 9, letterSpacing: 1 }]}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 17, fontFamily: mono, letterSpacing: -0.5 }}>
        {value || '—'}
        {unit && <Text style={{ fontSize: 10, color: C.dim }}> {unit}</Text>}
      </Text>
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.between}>
      <Text style={{ color: C.dim, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: mono }}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  layerDot: { width: 5, height: 5, borderRadius: 4, backgroundColor: C.lime },
});

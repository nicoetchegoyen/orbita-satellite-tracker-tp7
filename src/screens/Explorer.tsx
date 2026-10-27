import React, { useState } from 'react';
import { View, Pressable, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import type { Tracker } from '../hooks/useTracker';
import { C, ui, mono, fonts } from '../ui/theme';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';
import { SatelliteDrawing } from '../ui/OrbitalArt';
import { Badge, Button, Empty, RuleLabel } from '../ui/components';
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
  const viewport = useWindowDimensions(),
    wide = viewport.width >= 1180,
    small = viewport.width < 600;
  const { position: p, selected: s } = t,
    pass = t.passes[0];
  const mapHeight = wide
    ? 370
    : Math.max(190, Math.min(350, (viewport.width - (viewport.width >= 1000 ? 300 : 40)) / 2));
  const nativeMapAvailable =
    Platform.OS === 'ios' ||
    Constants.executionEnvironment === 'storeClient' ||
    Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);
  const age = s ? (t.now - Date.parse(s.epoch)) / 3600000 : 0;
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
  const orbit = p ? (p.altitude < 2000 ? 'LEO' : p.altitude < 30000 ? 'MEO' : 'GEO') : '—';

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 12 }}>
        <RuleLabel number="01" label="TU ESTACIÓN DE OBSERVACIÓN" />
        <View style={[ui.between, { gap: 16, alignItems: 'center' }]}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fonts.display,
              color: C.ink,
              fontSize: small ? 41 : 74,
              lineHeight: small ? 46 : 78,
              letterSpacing: small ? -2 : -4,
              flex: 1,
            }}
          >
            Mirá más allá<Text style={{ color: C.accent, fontFamily: fonts.display }}>.</Text>
          </Text>
          {small ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar satélite"
              onPress={onCatalog}
              style={styles.search}
            >
              <Icon name="search" size={21} color={C.panel} />
            </Pressable>
          ) : (
            <Button primary label="Buscar satélite" icon="search" onPress={onCatalog} />
          )}
        </View>
        <View style={[ui.between, { gap: 12, flexWrap: 'wrap' }]}>
          <Text style={[ui.body, { fontSize: small ? 13 : 15 }]}>
            El universo se mueve. Encontrá tu lugar para observarlo.
          </Text>
          <View style={[ui.row, { gap: 7 }]}>
            <Icon name="pin" size={13} color={C.accent} />
            <Text style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
              {t.settings.observer.name.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
        <View style={[styles.mapCard, { flex: wide ? 1 : undefined }]}>
          <View style={[ui.between, styles.mapHeader]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar satélite"
              onPress={onCatalog}
              style={[ui.row, { gap: 10, flex: 1, minWidth: 0, paddingVertical: 4 }]}
            >
              <View style={styles.targetIcon}>
                <Icon name="orbit" size={20} color={C.mapAccent} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: mono, fontSize: 9, color: '#9AAF9D', letterSpacing: 1 }}>
                  EN SEGUIMIENTO / {s?.id || '—'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.medium, color: C.panel, fontSize: 15 }}
                >
                  {s?.name || 'Seleccionar satélite'}
                </Text>
              </View>
              <Icon name="chevron" size={15} color={C.mapText} />
            </Pressable>
            <View style={{ marginLeft: 16 }}>
              <Badge dot label={orbit} color={C.mapAccent} />
            </View>
          </View>
          <View style={{ height: mapHeight }}>
            {native ? <NativeMap {...mapProps} /> : <AtlasMap {...mapProps} />}
          </View>
          <View style={styles.mapLayers}>
            <View style={[ui.row, { gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }]}>
              {(
                [
                  ['Trayectoria', showTrack, () => setShowTrack(!showTrack)],
                  ['Cobertura', showCoverage, () => setShowCoverage(!showCoverage)],
                  ['Starlink', t.constellationOn, () => t.setConstellationOn(!t.constellationOn)],
                ] as [string, boolean, () => void][]
              ).map(([label, active, action]) => (
                <Pressable
                  key={label}
                  accessibilityRole="checkbox"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active }}
                  onPress={action}
                  style={[
                    styles.layer,
                    active && { backgroundColor: '#FFFFFF0C', borderColor: '#6E8A72' },
                  ]}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: active ? C.mapAccent : '#708B79',
                    }}
                  />
                  <Text
                    style={{ fontFamily: mono, fontSize: 10, color: active ? C.panel : '#A6BBA9' }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!small && (
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[ui.row, { gap: 12 }]}>
                  <View style={[ui.row, { gap: 6 }]}>
                    <View
                      style={{
                        width: 14,
                        borderTopWidth: 1,
                        borderColor: C.mapAccent,
                        borderStyle: 'dashed',
                      }}
                    />
                    <Text style={{ fontFamily: mono, fontSize: 8, color: C.mapText }}>PASADO</Text>
                  </View>
                  <View style={[ui.row, { gap: 6 }]}>
                    <View style={{ width: 14, height: 1, backgroundColor: C.mapAccent }} />
                    <Text style={{ fontFamily: mono, fontSize: 8, color: C.mapText }}>FUTURO</Text>
                  </View>
                </View>
                {t.constellationPoints.length > 0 && (
                  <Text style={{ fontFamily: mono, fontSize: 9, color: C.mapText }}>
                    {t.constellationPoints.length} Starlink
                  </Text>
                )}
              </View>
            )}
          </View>
          {Platform.OS !== 'web' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!nativeMapAvailable) {
                  t.setNotice(
                    'El mapa nativo necesita una clave en este build. Podés seguir explorando con el atlas sin conexión.',
                  );
                  return;
                }
                setNative(!native);
              }}
              style={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                minHeight: 30,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: C.mapText, fontSize: 11 }}>
                {native ? 'Volver al atlas offline ↗' : 'Abrir mapa Google / Apple ↗'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.flightCard, { width: wide ? 300 : '100%' }]}>
          <View style={[ui.between, { gap: 16 }]}>
            <RuleLabel number="A" label="FICHA ORBITAL" />
            <Text style={{ fontFamily: mono, fontSize: 9, color: C.dim }}>
              NORAD / {s?.id || '—'}
            </Text>
          </View>
          {wide && (
            <View style={[ui.row, { justifyContent: 'space-between', marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.dim, fontFamily: mono, fontSize: 9, letterSpacing: 1 }}>
                  OBJETO SELECCIONADO
                </Text>
                <Text
                  style={{
                    color: C.text,
                    fontFamily: fonts.display,
                    fontSize: 27,
                    letterSpacing: -1,
                    marginTop: 8,
                  }}
                  numberOfLines={3}
                >
                  {s?.name || '—'}
                </Text>
              </View>
              <SatelliteDrawing size={92} />
            </View>
          )}
          <View style={[styles.metrics, { marginTop: wide ? 22 : 18 }]}>
            <Metric label="ALTITUD" value={p?.altitude.toFixed(1)} unit="km" />
            <Metric label="VELOCIDAD" value={p?.velocity.toFixed(2)} unit="km/s" />
          </View>
          <View
            style={[
              styles.metrics,
              { marginTop: 17, paddingBottom: 18, borderBottomWidth: 1, borderColor: C.border },
            ]}
          >
            <Metric small label="LATITUD" value={p ? coordinate(p.latitude, true) : '—'} />
            <Metric small label="LONGITUD" value={p ? coordinate(p.longitude, false) : '—'} />
          </View>
          <View style={[ui.between, { marginTop: 18, gap: 12 }]}>
            <View style={{ gap: 7 }}>
              <Text style={styles.microLabel}>AZIMUT / {p ? direction(p.azimuth) : '—'}</Text>
              <Text style={styles.angle}>{p?.azimuth.toFixed(1) || '—'}°</Text>
            </View>
            <View style={{ gap: 7 }}>
              <Text style={styles.microLabel}>ELEVACIÓN</Text>
              <Text
                style={[
                  styles.angle,
                  { color: p && p.elevation >= t.settings.minElevation ? C.green : C.muted },
                ]}
              >
                {p?.elevation.toFixed(1) || '—'}°
              </Text>
            </View>
            <View style={{ transform: [{ rotate: (p?.azimuth || 0) + 'deg' }] }}>
              <Icon name="arrow" color={C.accent} size={26} />
            </View>
          </View>
          <View style={[ui.row, { gap: 6, marginTop: 11, marginBottom: 18 }]}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: p && p.elevation >= t.settings.minElevation ? C.green : C.dim,
              }}
            />
            <Text style={{ fontSize: 11, color: C.muted }}>
              {p && p.elevation >= t.settings.minElevation
                ? 'Sobre tu horizonte operativo'
                : 'Bajo tu horizonte operativo'}
            </Text>
          </View>
          <Button label="Apuntar al satélite" icon="compass" onPress={onOrient} />
        </View>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
        <View style={[ui.card, { flex: wide ? 1 : undefined, padding: small ? 20 : 25 }]}>
          <View style={ui.between}>
            <RuleLabel number="02" label="EL PRÓXIMO ENCUENTRO" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver todos los pases"
              onPress={onPasses}
              style={{ minHeight: 40, justifyContent: 'center', paddingLeft: 12 }}
            >
              <Icon name="arrow" color={C.accent} size={20} />
            </Pressable>
          </View>
          {!pass ? (
            <Empty
              title={
                t.predicting
                  ? 'Trazando tu próximo encuentro…'
                  : 'Por ahora, el cielo se hace esperar.'
              }
              body={
                t.predicting
                  ? 'Calculando los pases desde tu ubicación.'
                  : `No hay pases por encima de ${t.settings.minElevation}° en las próximas ${t.settings.horizonHours} horas.`
              }
              loading={t.predicting}
            />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                gap: small ? 12 : 25,
                alignItems: 'center',
                paddingTop: 12,
              }}
            >
              <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
                <Badge
                  label={pass.optical ? 'ÓPTICO POSIBLE' : 'PASE DE RADIO'}
                  color={pass.optical ? C.accent : C.green}
                  dot
                />
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: small ? 42 : 58,
                    lineHeight: small ? 46 : 62,
                    letterSpacing: -2,
                    color: C.ink,
                  }}
                >
                  {time(pass.aos)}
                </Text>
                <Text style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
                  {date(pass.aos).toUpperCase()} / {countdown(pass.aos - t.now).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 12, color: C.muted, lineHeight: 19 }}>
                  Máxima {pass.maxElevation.toFixed(0)}° · {direction(pass.aosAzimuth)} →{' '}
                  {direction(pass.losAzimuth)}
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <Button
                    label="Explorar este pase"
                    icon="arrow"
                    primary
                    small
                    onPress={onPasses}
                  />
                </View>
              </View>
              <View style={{ width: small ? 126 : 205 }}>
                <SkyChart pass={pass} current={p} compact />
              </View>
            </View>
          )}
          {pass && (
            <View style={styles.passTimeline}>
              {[
                ['AOS', pass.aos],
                ['MÁXIMO', pass.tca],
                ['LOS', pass.los],
              ].map(([label, value]) => (
                <View key={label} style={{ gap: 6 }}>
                  <Text style={styles.microLabel}>{label}</Text>
                  <Text style={{ fontFamily: mono, color: C.text, fontSize: 12 }}>
                    {label === 'LOS' && pass.continuous ? 'CONTINÚA' : time(Number(value))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={[ui.card, { width: wide ? 300 : '100%', padding: 23, gap: 18 }]}>
          <RuleLabel number="B" label="DATOS DE ORIGEN" />
          <Info
            label="FUENTE"
            value={
              s
                ? `${s.source === 'celestrak' ? 'CelesTrak' : s.source}${s.supplemental ? ' / SupGP' : ''}`
                : '—'
            }
          />
          <Info label="EDAD DEL MODELO" value={s ? Math.max(0, age).toFixed(1) + ' h' : '—'} />
          <Info label="PERÍODO" value={s ? (orbitalPeriod(s) / 60000).toFixed(1) + ' min' : '—'} />
          <Info label="ELEVACIÓN MÍN." value={t.settings.minElevation + '°'} />
          <View style={{ height: 1, backgroundColor: C.border }} />
          <Text style={{ fontSize: 11, color: age > 48 ? C.amber : C.dim, lineHeight: 18 }}>
            {age > 48
              ? 'Estos elementos tienen más de 48 horas. Actualizalos para mejorar la precisión.'
              : 'La posición se calcula en tu dispositivo. Los elementos orbitales se renuevan con caché de 18 h.'}
          </Text>
        </View>
      </View>
    </View>
  );
}
function Metric({
  label,
  value,
  unit,
  small = false,
}: {
  label: string;
  value?: string;
  unit?: string;
  small?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={styles.microLabel}>{label}</Text>
      <Text
        style={{
          fontFamily: small ? mono : fonts.display,
          color: C.text,
          fontSize: small ? 13 : 31,
          letterSpacing: small ? -0.5 : -1.2,
        }}
      >
        {value || '—'}
        {unit && <Text style={{ fontFamily: mono, color: C.dim, fontSize: 10 }}> {unit}</Text>}
      </Text>
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={[ui.between, { gap: 10 }]}>
      <Text style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: 0.3 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: mono, fontSize: 11, color: C.text }}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  search: {
    width: 46,
    height: 46,
    backgroundColor: C.ink,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    backgroundColor: C.map,
    borderWidth: 1,
    borderColor: C.map,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapHeader: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#405A4860',
    gap: 12,
  },
  targetIcon: {
    width: 35,
    height: 35,
    borderWidth: 1,
    borderColor: '#68847360',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  mapLayers: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderColor: '#405A4860',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 11,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
  },
  flightCard: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 22,
  },
  metrics: { flexDirection: 'row', gap: 20 },
  microLabel: { fontFamily: mono, color: C.dim, fontSize: 9, letterSpacing: 0.6 },
  angle: { fontFamily: mono, fontSize: 23, color: C.text, letterSpacing: -1 },
  passTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: C.border,
    paddingTop: 17,
    marginTop: 22,
  },
});

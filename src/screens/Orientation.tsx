import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import type { Tracker } from '../hooks/useTracker';
import { C, ui, mono } from '../ui/theme';
import { Button, Badge } from '../ui/components';
import { direction } from '../ui/format';
export function Orientation({ tracker: t }: { tracker: Tracker }) {
  const [heading, setHeading] = useState<number | null>(null),
    [pitch, setPitch] = useState<number | null>(null),
    [accuracy, setAccuracy] = useState(-1),
    [enabled, setEnabled] = useState(false),
    [magnetic, setMagnetic] = useState(false);
  const subs = useRef<{ remove: () => void }[]>([]),
    smoothed = useRef<number | null>(null);
  useEffect(
    () => () => {
      subs.current.forEach((s) => s.remove());
    },
    [],
  );
  async function enable() {
    if (enabled) {
      subs.current.forEach((s) => s.remove());
      subs.current = [];
      setEnabled(false);
      setHeading(null);
      setPitch(null);
      return;
    }
    if (Platform.OS === 'web') {
      t.setNotice(
        'La brújula requiere sensores en un dispositivo Android/iOS. Podés usar el azimut y la elevación como referencia manual.',
      );
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          'La orientación necesita permiso de ubicación para obtener el norte verdadero.',
        );
      const sub = await Location.watchHeadingAsync((h) => {
        const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        const previous = smoothed.current ?? value;
        const delta = ((value - previous + 540) % 360) - 180;
        const next = (previous + 0.25 * delta + 360) % 360;
        smoothed.current = next;
        setHeading(next);
        setAccuracy(h.accuracy);
        setMagnetic(h.trueHeading < 0);
      });
      subs.current.push(sub);
      setEnabled(true);
      if (await DeviceMotion.isAvailableAsync()) {
        const permission = await DeviceMotion.requestPermissionsAsync();
        if (permission.granted) {
          DeviceMotion.setUpdateInterval(200);
          subs.current.push(
            DeviceMotion.addListener((d) => {
              const g = d.accelerationIncludingGravity;
              if (g) setPitch((Math.atan2(-g.z, Math.hypot(g.x, g.y)) * 180) / Math.PI);
            }),
          );
        }
      }
    } catch (e) {
      t.setNotice((e as Error).message);
    }
  }
  const p = t.position,
    delta = p && heading !== null ? ((p.azimuth - heading + 540) % 360) - 180 : null;
  const aligned = delta !== null && Math.abs(delta) < 5;
  const wide = useWindowDimensions().width > 1050;
  return (
    <View style={{ gap: 24 }}>
      <View>
        <Text style={ui.label}>ORIENTACIÓN ASISTIDA</Text>
        <Text style={[ui.h1, { marginTop: 8 }]}>
          Mirá en la dirección correcta<Text style={{ color: C.lime }}>.</Text>
        </Text>
        <Text style={[ui.body, { marginTop: 7 }]}>
          Azimut y elevación de {t.selected?.name} desde tu ubicación.
        </Text>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
        <View style={[ui.card, { flex: 1, padding: 28, alignItems: 'center', gap: 22 }]}>
          <Badge
            label={
              enabled ? (magnetic ? 'NORTE MAGNÉTICO' : 'NORTE VERDADERO') : 'REFERENCIA MANUAL'
            }
            color={enabled ? C.lime : C.blue}
          />
          <View style={{ width: '100%', maxWidth: 380, aspectRatio: 1 }}>
            <Svg viewBox="0 0 360 360" width="100%" height="100%">
              <Circle cx="180" cy="180" r="151" fill="#0B1522" stroke={C.border} />
              <Circle
                cx="180"
                cy="180"
                r="115"
                fill="none"
                stroke={C.border}
                strokeDasharray="2 8"
              />
              <G transform={`rotate(${heading === null ? 0 : -heading} 180 180)`}>
                {Array.from({ length: 72 }, (_, i) => {
                  const a = (i * 5 * Math.PI) / 180;
                  return (
                    <Line
                      key={i}
                      x1={180 + 134 * Math.sin(a)}
                      y1={180 - 134 * Math.cos(a)}
                      x2={180 + (i % 9 === 0 ? 148 : 140) * Math.sin(a)}
                      y2={180 - (i % 9 === 0 ? 148 : 140) * Math.cos(a)}
                      stroke={i % 18 === 0 ? C.lime : C.dim}
                      strokeWidth={i % 9 === 0 ? 2 : 1}
                    />
                  );
                })}
                {['N', 'E', 'S', 'O'].map((s, i) => {
                  const a = (i * Math.PI) / 2;
                  return (
                    <SvgText
                      key={s}
                      x={180 + 118 * Math.sin(a)}
                      y={185 - 118 * Math.cos(a)}
                      fill={i === 0 ? C.lime : C.muted}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="600"
                    >
                      {s}
                    </SvgText>
                  );
                })}
              </G>
              <Path d="m180 14-5 10h10Z" fill={C.text} />
              {p && (
                <G transform={`rotate(${delta ?? p.azimuth} 180 180)`}>
                  <Path d="m180 75 19 55-19-9-19 9Z" fill={aligned ? C.lime : C.blue} />
                  <Line
                    x1="180"
                    y1="129"
                    x2="180"
                    y2="152"
                    stroke={aligned ? C.lime : C.blue}
                    strokeWidth="2"
                    strokeDasharray="3 5"
                  />
                </G>
              )}
              <SvgText
                x="180"
                y="188"
                fill={C.text}
                fontSize="36"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {heading !== null ? `${heading.toFixed(0)}°` : '—'}
              </SvgText>
              <SvgText
                x="180"
                y="211"
                fill={C.dim}
                fontSize="10"
                letterSpacing="1.5"
                textAnchor="middle"
              >
                RUMBO DEL DISPOSITIVO
              </SvgText>
            </Svg>
          </View>
          <Text style={{ color: aligned ? C.lime : C.text, fontSize: 18, textAlign: 'center' }}>
            {delta === null
              ? 'Activá la brújula para orientar el dispositivo'
              : aligned
                ? 'Azimut alineado'
                : `Girá ${Math.abs(delta).toFixed(0)}° a la ${delta > 0 ? 'derecha' : 'izquierda'}`}
          </Text>
          <Button
            primary
            label={enabled ? 'Desactivar sensores' : 'Activar brújula'}
            icon="compass"
            onPress={() => void enable()}
          />
        </View>
        <View style={[ui.card, { width: wide ? 320 : '100%', padding: 24, gap: 22 }]}>
          <Text style={ui.label}>OBJETIVO ACTUAL</Text>
          <Text style={ui.title}>{t.selected?.name}</Text>
          <View style={ui.between}>
            <Text style={ui.body}>Azimut objetivo</Text>
            <Text style={{ color: C.lime, fontSize: 25, fontFamily: mono }}>
              {p?.azimuth.toFixed(1) || '—'}°
            </Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.body}>Elevación objetivo</Text>
            <Text style={{ color: C.text, fontSize: 25, fontFamily: mono }}>
              {p?.elevation.toFixed(1) || '—'}°
            </Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.body}>Inclinación del equipo</Text>
            <Text style={{ color: C.muted, fontFamily: mono }}>
              {pitch !== null ? `${pitch.toFixed(0)}°` : 'Sin sensor'}
            </Text>
          </View>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: C.raised }}>
            <View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: C.lime,
                width: `${Math.max(0, Math.min(100, ((p?.elevation || 0) / 90) * 100))}%`,
              }}
            />
          </View>
          <Text
            style={{
              color: p && p.elevation < 0 ? C.amber : C.muted,
              fontSize: 12,
              lineHeight: 20,
            }}
          >
            {p && p.elevation < 0
              ? 'El satélite está bajo el horizonte. Esperá al próximo pase para apuntar hacia él.'
              : `Apuntá hacia ${p ? direction(p.azimuth) : 'el objetivo'} y elevá el eje de la cámara hasta el ángulo indicado.`}
          </Text>
          {enabled && accuracy <= 1 && (
            <Text style={{ color: C.amber, fontSize: 12, lineHeight: 20 }}>
              Precisión magnética baja. Mové el dispositivo en forma de ocho y alejalo de objetos
              metálicos.
            </Text>
          )}
          <Text style={{ color: C.dim, fontSize: 11, lineHeight: 19 }}>
            Overlay de orientación simplificado. La inclinación indica el eje perpendicular a la
            pantalla; la exactitud depende de la calibración de los sensores. La referencia
            magnética puede diferir del norte verdadero.
          </Text>
        </View>
      </View>
    </View>
  );
}

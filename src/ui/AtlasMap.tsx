import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Pressable } from 'react-native';
import { Text } from './Text';
import Svg, {
  Path,
  Line,
  Circle,
  G,
  Rect,
  Defs,
  Pattern,
  Text as SvgText,
  ClipPath,
} from 'react-native-svg';
import type { GeoPoint, Observer, SatellitePosition } from '../core/types';
import { DEG, footprintRadius, splitAntimeridian } from '../core/geo';
import atlas from '../../assets/world-path.json';
import { C, mono } from './theme';
import { Icon } from './Icon';
export interface SatelliteMapProps {
  position: SatellitePosition | null;
  observer: Observer;
  past: GeoPoint[][];
  future: GeoPoint[][];
  constellation: SatellitePosition[];
  minElevation: number;
  showTrack: boolean;
  showCoverage: boolean;
}
const project = (p: Pick<GeoPoint, 'latitude' | 'longitude'>) => ({
  x: p.longitude + 180,
  y: 90 - p.latitude,
});
const pathOf = (points: GeoPoint[]) =>
  points
    .map((p, i) => {
      const q = project(p);
      return `${i ? 'L' : 'M'}${q.x.toFixed(3)},${q.y.toFixed(3)}`;
    })
    .join('');
/** Unwrapped cap boundaries, repeated at +/-360 and clipped by the atlas. Handles polar caps. */
function capPath(p: GeoPoint, min: number) {
  const r = footprintRadius(p.altitude, min),
    phi = p.latitude * DEG;
  const lo = Math.max(-90, p.latitude - r / DEG),
    hi = Math.min(90, p.latitude + r / DEG);
  const left: string[] = [],
    right: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const lat = lo + ((hi - lo) * i) / 100,
      l = lat * DEG;
    const denominator = Math.cos(phi) * Math.cos(l);
    const ratio = (Math.cos(r) - Math.sin(phi) * Math.sin(l)) / Math.max(1e-12, denominator);
    const width = Math.acos(Math.max(-1, Math.min(1, ratio))) / DEG;
    left.push(`${p.longitude + 180 - width},${90 - lat}`);
    right.push(`${p.longitude + 180 + width},${90 - lat}`);
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}
export default function AtlasMap(props: SatelliteMapProps) {
  const { position, observer, past, future, constellation, minElevation, showTrack, showCoverage } =
    props;
  const [zoom, setZoom] = useState(1),
    [follow, setFollow] = useState(false),
    [size, setSize] = useState({ width: 1, height: 1 });
  const current = position ? project(position) : { x: 180, y: 90 };
  const viewW = 360 / zoom,
    viewH = 180 / zoom;
  const x = follow ? Math.max(0, Math.min(360 - viewW, current.x - viewW / 2)) : (360 - viewW) / 2;
  const y = follow ? Math.max(0, Math.min(180 - viewH, current.y - viewH / 2)) : (180 - viewH) / 2;
  const marker = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const previousX = useRef(0);
  useEffect(() => {
    const to = {
      x: ((current.x - x) / viewW) * size.width,
      y: ((current.y - y) / viewH) * size.height,
    };
    if (Math.abs(to.x - previousX.current) > size.width / 2) marker.setValue(to);
    else Animated.timing(marker, { toValue: to, duration: 1700, useNativeDriver: false }).start();
    previousX.current = to.x;
  }, [current.x, current.y, x, y, viewW, viewH, size]);
  const o = project(observer);
  return (
    <View style={styles.container} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`${x} ${y} ${viewW} ${viewH}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <Pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
            <Circle cx=".4" cy=".4" r=".22" fill="#53705B" opacity=".5" />
          </Pattern>
          <ClipPath id="bounds">
            <Rect width="360" height="180" />
          </ClipPath>
        </Defs>
        <Rect width="360" height="180" fill={C.map} />
        <Rect width="360" height="180" fill="url(#dots)" />
        <G clipPath="url(#bounds)">
          {Array.from({ length: 11 }, (_, i) => (
            <Line
              key={`l${i}`}
              x1={(i + 1) * 30}
              y1="0"
              x2={(i + 1) * 30}
              y2="180"
              stroke="#52705B"
              strokeOpacity=".25"
              strokeWidth=".2"
            />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <Line
              key={`a${i}`}
              x1="0"
              y1={(i + 1) * 30}
              x2="360"
              y2={(i + 1) * 30}
              stroke="#52705B"
              strokeOpacity=".25"
              strokeWidth=".2"
            />
          ))}
          <Path d={atlas.path} fill={C.mapLand} stroke={C.mapStroke} strokeWidth=".35" />
          <Line
            x1="0"
            y1="90"
            x2="360"
            y2="90"
            stroke="#8CA591"
            strokeOpacity=".45"
            strokeWidth=".3"
            strokeDasharray="2 2"
          />
          {showCoverage &&
            position &&
            [-360, 0, 360].map((offset) => (
              <Path
                key={offset}
                d={capPath(position, minElevation)}
                transform={`translate(${offset} 0)`}
                fill={C.mapAccent}
                fillOpacity=".075"
                stroke={C.mapAccent}
                strokeOpacity=".5"
                strokeWidth=".45"
              />
            ))}
          {showTrack &&
            past.map((p, i) => (
              <Path
                key={`p${i}`}
                d={pathOf(p)}
                fill="none"
                stroke={C.mapAccent}
                strokeOpacity=".4"
                strokeWidth=".65"
                strokeDasharray="2 2"
              />
            ))}
          {showTrack &&
            future.map((p, i) => (
              <Path key={`f${i}`} d={pathOf(p)} fill="none" stroke={C.mapAccent} strokeWidth=".8" />
            ))}
          {constellation.map((p, i) => {
            const q = project(p);
            return <Circle key={i} cx={q.x} cy={q.y} r=".8" fill="#C6D8C1" opacity=".85" />;
          })}
          <Circle cx={o.x} cy={o.y} r="3.2" fill="#C6D8C1" fillOpacity=".15" />
          <Circle cx={o.x} cy={o.y} r="1.2" fill="#C6D8C1" />
          {size.width > 600 && (
            <>
              <SvgText x={o.x + 3} y={o.y + 1} fill="#D5DFC9" fontSize="3" fontWeight="500">
                {observer.source === 'gps' ? 'TU UBICACIÓN' : observer.name.toUpperCase()}
              </SvgText>
              <SvgText x="12" y="78" fill="#8CA591" fontSize="4" letterSpacing=".8">
                PACÍFICO
              </SvgText>
              <SvgText x="145" y="108" fill="#8CA591" fontSize="4" letterSpacing=".8">
                ATLÁNTICO
              </SvgText>
              <SvgText x="242" y="113" fill="#8CA591" fontSize="4" letterSpacing=".8">
                ÍNDICO
              </SvgText>
            </>
          )}
        </G>
      </Svg>
      {position && (
        <Animated.View
          pointerEvents="none"
          style={[styles.marker, { left: marker.x, top: marker.y }]}
        >
          <View style={styles.markerHalo}>
            <View style={styles.markerCore}>
              <Icon name="orbit" size={17} color={C.ink} />
            </View>
          </View>
        </Animated.View>
      )}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Acercar mapa"
          onPress={() => setZoom((z) => Math.min(4, z * 1.5))}
          style={styles.control}
        >
          <Icon name="plus" size={17} color={C.mapText} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alejar mapa"
          onPress={() => setZoom((z) => Math.max(1, z / 1.5))}
          style={styles.control}
        >
          <Icon name="minus" size={17} color={C.mapText} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centrar satélite"
          onPress={() => {
            setFollow((v) => !v);
            setZoom(follow ? 1 : 2);
          }}
          style={styles.control}
        >
          <Icon name="target" size={17} color={follow ? C.mapAccent : C.mapText} />
        </Pressable>
      </View>
      <View style={styles.coordinates}>
        <Text style={{ fontFamily: mono, fontSize: 9, color: C.mapText }}>W 180°</Text>
        <Text style={{ fontFamily: mono, fontSize: 9, color: C.mapText }}>
          ATLAS MUNDIAL · WGS84
        </Text>
        <Text style={{ fontFamily: mono, fontSize: 9, color: C.mapText }}>180° E</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.map, overflow: 'hidden', minHeight: 160 },
  controls: { position: 'absolute', top: 18, right: 16, gap: 5 },
  control: {
    width: 44,
    height: 44,
    backgroundColor: '#173A30EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#68847380',
  },
  coordinates: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marker: { position: 'absolute', width: 46, height: 46, marginLeft: -23, marginTop: -23 },
  markerHalo: {
    width: 46,
    height: 46,
    borderRadius: 30,
    backgroundColor: '#FF916918',
    borderWidth: 1,
    borderColor: '#FF916966',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCore: {
    width: 27,
    height: 27,
    borderRadius: 20,
    backgroundColor: C.mapAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

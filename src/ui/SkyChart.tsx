import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import type { SatellitePass, SatellitePosition } from '../core/types';
import { polarPoint } from '../core/geo';
import { C, ui } from './theme';
export function SkyChart({
  pass,
  current,
  compact = false,
}: {
  pass?: SatellitePass;
  current?: SatellitePosition | null;
  compact?: boolean;
}) {
  const points = pass?.samples.map((s) => polarPoint(s.azimuth, s.elevation));
  const d = points?.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('');
  const a = points?.[0],
    b = points?.at(-1);
  const max = pass
    ? polarPoint(
        pass.samples.reduce((a, b) =>
          Math.abs(a.time - pass.tca) < Math.abs(b.time - pass.tca) ? a : b,
        ).azimuth,
        pass.maxElevation,
      )
    : null;
  const p =
    current && current.elevation >= 0 ? polarPoint(current.azimuth, current.elevation) : null;
  return (
    <View
      style={{ width: '100%', maxWidth: compact ? 230 : 390, alignSelf: 'center', aspectRatio: 1 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 320">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#6B9A58" />
            <Stop offset="1" stopColor={C.lime} />
          </LinearGradient>
        </Defs>
        <Circle cx="160" cy="160" r="130" fill="#0C1624" stroke="#354455" strokeWidth="1" />
        {[43.33, 86.66].map((r) => (
          <Circle
            key={r}
            cx="160"
            cy="160"
            r={r}
            fill="none"
            stroke="#2B394A"
            strokeDasharray="3 5"
          />
        ))}
        {[0, 45, 90, 135].map((a) => (
          <Line
            key={a}
            x1="30"
            y1="160"
            x2="290"
            y2="160"
            stroke="#2B394A"
            strokeWidth=".7"
            transform={`rotate(${a} 160 160)`}
          />
        ))}
        {['N', 'E', 'S', 'O'].map((s, i) => {
          const q = polarPoint(i * 90, -12, 147);
          const v = [
            { x: 160, y: 15 },
            { x: 309, y: 164 },
            { x: 160, y: 311 },
            { x: 11, y: 164 },
          ][i];
          return (
            <SvgText
              key={s}
              x={v.x}
              y={v.y}
              fill={s === 'N' ? C.lime : C.muted}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
            >
              {s}
            </SvgText>
          );
        })}
        <SvgText x="166" y="36" fill={C.dim} fontSize="9">
          0°
        </SvgText>
        <SvgText x="166" y="79" fill={C.dim} fontSize="9">
          30°
        </SvgText>
        <SvgText x="166" y="122" fill={C.dim} fontSize="9">
          60°
        </SvgText>
        <Circle cx="160" cy="160" r="2" fill={C.dim} />
        {d && <Path d={d} fill="none" stroke="url(#sky)" strokeWidth="2.5" strokeLinecap="round" />}
        {a && (
          <>
            <Circle cx={a.x} cy={a.y} r="5" fill={C.panel} stroke={C.lime} strokeWidth="1.5" />
            <SvgText x={a.x + 9} y={a.y - 8} fill={C.lime} fontSize="10">
              AOS
            </SvgText>
          </>
        )}
        {b && (
          <>
            <Circle cx={b.x} cy={b.y} r="4" fill={C.lime} />
            <SvgText x={b.x + 8} y={b.y + 14} fill={C.lime} fontSize="10">
              LOS
            </SvgText>
          </>
        )}
        {max && (
          <>
            <Circle cx={max.x} cy={max.y} r="4" fill={C.lime} />
            <SvgText x={max.x + 8} y={max.y - 9} fill={C.text} fontSize="11">
              {pass!.maxElevation.toFixed(0)}°
            </SvgText>
          </>
        )}
        {p && (
          <>
            <Circle cx={p.x} cy={p.y} r="10" fill={C.blue} fillOpacity=".2" />
            <Circle cx={p.x} cy={p.y} r="4" fill={C.blue} />
          </>
        )}
        {!pass && (
          <SvgText x="160" y="185" fill={C.dim} textAnchor="middle" fontSize="11">
            Sin pase seleccionado
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

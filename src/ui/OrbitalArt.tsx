import React from 'react';
import Svg, { Path, Circle, Line, G, Rect } from 'react-native-svg';
import { C } from './theme';

export function StationMark({ size = 34, color = C.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="14" stroke={color} strokeWidth="1.4" />
      <Path
        d="M5 30 35 10M10 5l20 30M3 20h7m20 0h7M20 3v7m0 20v7"
        stroke={color}
        strokeWidth="1.4"
      />
      <Circle cx="20" cy="20" r="4.5" fill={color} />
      <Circle cx="31" cy="12.5" r="3.5" fill={C.bg} stroke={color} strokeWidth="1.6" />
    </Svg>
  );
}

export function SatelliteDrawing({ size = 110 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 180 126" fill="none">
      <Path
        d="M4 110h172M90 6v110M8 16h14m-7-7v14m145 83h14m-7-7v14"
        stroke={C.border}
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <G transform="rotate(-26 90 63)" stroke={C.ink} strokeWidth="1.4">
        <Rect x="10" y="39" width="49" height="41" fill="#E3E7DA" />
        <Rect x="121" y="39" width="49" height="41" fill="#E3E7DA" />
        <Path d="M26 39v41m16-41v41M10 53h49M10 67h49m78-28v41m16-41v41m-32-27h49m-49 14h49M59 59h13m36 0h13" />
        <Rect x="72" y="34" width="36" height="51" rx="2" fill={C.panel} />
        <Path d="m72 34 9-8h35l-8 8m0 0 8-8v50l-8 9M90 85v14m-12 0h24M83 44h15m-15 7h9" />
        <Circle cx="90" cy="67" r="5" fill={C.accent} stroke={C.accent} />
        <Path d="M91 26V13m-8 0h16" stroke={C.accent} />
      </G>
    </Svg>
  );
}

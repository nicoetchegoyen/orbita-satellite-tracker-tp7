import React from 'react';
import Svg, { Circle, Path, Ellipse, Line, Rect } from 'react-native-svg';
import { C } from './theme';
export type IconName =
  | 'orbit'
  | 'map'
  | 'passes'
  | 'compass'
  | 'check'
  | 'settings'
  | 'search'
  | 'pin'
  | 'arrow'
  | 'chevron'
  | 'bell'
  | 'refresh'
  | 'close'
  | 'layers'
  | 'sun'
  | 'moon'
  | 'signal'
  | 'plus'
  | 'minus'
  | 'target'
  | 'download';
export function Icon({
  name,
  size = 20,
  color = C.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const props = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...props}>
      {name === 'orbit' && (
        <>
          <Circle cx="12" cy="12" r="3" fill={color} strokeWidth="0" />
          <Ellipse cx="12" cy="12" rx="11" ry="5.8" transform="rotate(-38 12 12)" />
          <Circle cx="19" cy="5.5" r="2.2" fill={color} strokeWidth="0" />
        </>
      )}
      {name === 'map' && (
        <>
          <Path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" />
          <Path d="M9 3v16M15 5v16" />
        </>
      )}
      {name === 'passes' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" />
          <Path d="M7 3v4M17 3v4M3 10h18M7 15h3M14 15h3" />
        </>
      )}
      {name === 'compass' && (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
        </>
      )}
      {name === 'check' && (
        <>
          <Path d="m8 12 3 3 6-6" />
          <Path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="m10 2 4 0 1 3 3 1 3 1v4l-3 1-1 3-1 3h-4l-1-3-3-1-3-1v-4l3-1 1-3Z" />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" />
          <Path d="m16 16 5 5" />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1 1 14 0Z" />
          <Circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === 'arrow' && <Path d="M5 19 19 5M5 5h14v14" />}
      {name === 'chevron' && <Path d="m9 5 7 7-7 7" />}
      {name === 'bell' && (
        <>
          <Path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3ZM10 21h4" />
        </>
      )}
      {name === 'refresh' && (
        <>
          <Path d="M20 7a9 9 0 1 0 1 9M20 2v5h-5" />
        </>
      )}
      {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
      {name === 'layers' && (
        <>
          <Path d="m12 3 10 6-10 6L2 9ZM2 13l10 6 10-6M2 17l10 6 10-6" />
        </>
      )}
      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2" />
        </>
      )}
      {name === 'moon' && <Path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z" />}
      {name === 'signal' && (
        <>
          <Path d="M5 20v-4M10 20V11M15 20V7M20 20V3" />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" />}
      {name === 'minus' && <Path d="M5 12h14" />}
      {name === 'target' && (
        <>
          <Circle cx="12" cy="12" r="7" />
          <Circle cx="12" cy="12" r="2" />
          <Path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
        </>
      )}
      {name === 'download' && (
        <>
          <Path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
        </>
      )}
    </Svg>
  );
}

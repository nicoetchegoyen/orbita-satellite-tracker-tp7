import React, { useEffect, useRef } from 'react';
import MapView, {
  Marker,
  MarkerAnimated,
  AnimatedRegion,
  Polyline,
  Circle,
  type MapMarkerProps,
} from 'react-native-maps';
import type { SatelliteMapProps } from './AtlasMap';
import { EARTH_RADIUS, footprintRadius } from '../core/geo';
import { C } from './theme';
// RN 0.88's AnimatedComponent type loses class component props in this library.
const AnimatedMarker = MarkerAnimated as unknown as React.ComponentType<
  Omit<MapMarkerProps, 'coordinate'> & { coordinate: AnimatedRegion }
>;
export default function NativeMap({
  position,
  observer,
  past,
  future,
  constellation,
  minElevation,
  showTrack,
  showCoverage,
}: SatelliteMapProps) {
  const coordinate = useRef(
    new AnimatedRegion({
      latitude: position?.latitude || 0,
      longitude: position?.longitude || 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const last = useRef(position?.longitude || 0);
  useEffect(() => {
    if (!position) return;
    const value = {
      latitude: position.latitude,
      longitude: position.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    };
    if (Math.abs(position.longitude - last.current) > 180) coordinate.setValue(value);
    else
      coordinate.timing({ ...value, duration: 1800, useNativeDriver: false, toValue: 0 }).start();
    last.current = position.longitude;
  }, [position]);
  return (
    <MapView
      style={{ flex: 1, minHeight: 160 }}
      initialRegion={{ latitude: 0, longitude: 0, latitudeDelta: 150, longitudeDelta: 300 }}
      userInterfaceStyle="dark"
      mapType="standard"
    >
      {position && (
        <AnimatedMarker coordinate={coordinate} title="Satélite seleccionado" pinColor={C.lime} />
      )}
      <Marker coordinate={observer} title={observer.name} pinColor={C.blue} />
      {showTrack &&
        past.map((points, i) => (
          <Polyline
            key={`p${i}`}
            coordinates={points}
            strokeColor="#BBF57880"
            strokeWidth={2}
            lineDashPattern={[6, 5]}
          />
        ))}
      {showTrack &&
        future.map((points, i) => (
          <Polyline key={`f${i}`} coordinates={points} strokeColor={C.lime} strokeWidth={2} />
        ))}
      {showCoverage && position && (
        <Circle
          center={position}
          radius={EARTH_RADIUS * 1000 * footprintRadius(position.altitude, minElevation)}
          fillColor="#BBF57819"
          strokeColor="#BBF578AA"
          strokeWidth={1}
        />
      )}
      {constellation.map((p, i) => (
        <Marker key={i} coordinate={p} pinColor={C.blue} tracksViewChanges={false} />
      ))}
    </MapView>
  );
}

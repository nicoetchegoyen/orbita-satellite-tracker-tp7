import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Satellite Tracker',
  slug: 'satellite-tracker-tp7',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  scheme: 'satellite-tracker',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'ar.edu.tp7.satellitetracker',
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['processing'],
      BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing'],
    },
  },
  android: {
    package: 'ar.edu.tp7.satellitetracker',
    adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#080F1C' },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'POST_NOTIFICATIONS',
      'RECEIVE_BOOT_COMPLETED',
      'SCHEDULE_EXACT_ALARM',
    ],
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || '' } },
  },
  web: { bundler: 'metro', favicon: './assets/icon.png', name: 'Satellite Tracker' },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Tu ubicación permite calcular azimut, elevación y los próximos pases satelitales.',
      },
    ],
    ['expo-notifications', { color: '#B5F36B', defaultChannel: 'passes' }],
    'expo-background-task',
    'expo-status-bar',
    'expo-font',
    [
      'expo-sensors',
      { motionPermission: 'La orientación del dispositivo permite apuntar hacia el satélite.' },
    ],
  ],
};
export default config;

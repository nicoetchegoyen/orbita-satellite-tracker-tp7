import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../core/types';
import type { Settings } from '../core/types';
export async function readSettings(): Promise<Settings> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem('settings:v1')) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      observer: { ...DEFAULT_SETTINGS.observer, ...saved.observer },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export async function writeSettings(settings: Settings) {
  await AsyncStorage.setItem('settings:v1', JSON.stringify(settings));
}

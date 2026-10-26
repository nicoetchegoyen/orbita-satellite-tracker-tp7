import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { OrbitalObject, SatellitePass, Settings } from '../core/types';
import { predictPasses } from '../core/prediction';
import { loadObject } from '../data/client';
export interface Reminder {
  id: string;
  notificationId: string;
  object: OrbitalObject;
  aos: number;
  los: number;
  leadMinutes: number;
  minElevation: number;
}
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function listReminders(): Promise<Reminder[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem('reminders:v1')) || '[]');
  } catch {
    return [];
  }
}
async function persist(reminders: Reminder[]) {
  await AsyncStorage.setItem('reminders:v1', JSON.stringify(reminders));
}
async function ensurePermissions(interactive = true) {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('passes', {
      name: 'Pases satelitales',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted && interactive) p = await Notifications.requestPermissionsAsync();
  if (!p.granted)
    throw new Error(
      'Habilitá las notificaciones en Ajustes del dispositivo para recibir recordatorios.',
    );
  if (Platform.OS === 'android') {
    let exact = await Notifications.getExactAlarmPermissionsAsync();
    if (!exact.granted && interactive)
      exact = await Notifications.requestExactAlarmPermissionsAsync();
    if (!exact.granted)
      throw new Error(
        'Habilitá las alarmas y recordatorios exactos de Android para avisar antes del pase.',
      );
  }
}
export async function scheduleReminder(
  object: OrbitalObject,
  pass: SatellitePass,
  settings: Settings,
  interactive = true,
) {
  const when = pass.aos - settings.leadMinutes * 60_000;
  if (when <= Date.now())
    throw new Error(
      'La anticipación elegida ya pasó. Reducí los minutos de aviso o elegí otro pase.',
    );
  await ensurePermissions(interactive);
  const reminders = await listReminders();
  if (reminders.some((r) => r.id === pass.id)) return;
  if (reminders.length >= 50)
    throw new Error('Se alcanzó el máximo de 50 recordatorios. Cancelá alguno desde Ajustes.');
  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: pass.id,
    content: {
      title: `${object.name}: próximo pase`,
      body: `Comienza en ${settings.leadMinutes} min. Elevación máxima ${pass.maxElevation.toFixed(0)}°. Mirá hacia ${pass.aosAzimuth.toFixed(0)}°.`,
      sound: 'default',
      data: { satelliteId: object.id, passId: pass.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(when),
      channelId: 'passes',
      delivery: 'alarmClock',
    },
  });
  await persist([
    ...reminders,
    {
      id: pass.id,
      notificationId,
      object,
      aos: pass.aos,
      los: pass.los,
      leadMinutes: settings.leadMinutes,
      minElevation: settings.minElevation,
    },
  ]);
}
export async function cancelReminder(id: string) {
  const all = await listReminders();
  const r = all.find((r) => r.id === id);
  if (r) await Notifications.cancelScheduledNotificationAsync(r.notificationId);
  await persist(all.filter((r) => r.id !== id));
}
export async function testNotification() {
  await ensurePermissions();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Satellite Tracker · prueba',
      body: 'Las notificaciones locales están listas. Elegí un pase para recibir un aviso antes del AOS.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'passes',
    },
  });
  return 'Notificación de prueba programada para dentro de 5 segundos.';
}
export async function refreshReminders(settings: Settings) {
  const all = await listReminders();
  for (const r of all) {
    if (r.los < Date.now()) {
      await cancelReminder(r.id);
      continue;
    }
    if (r.aos - r.leadMinutes * 60_000 <= Date.now()) continue;
    const object = await loadObject(r.object.id, r.object.group);
    const passes = await predictPasses(
      object,
      settings.observer,
      Math.max(Date.now(), r.aos - 20 * 60_000),
      2,
      r.minElevation,
    );
    const matching = passes.find((p) => Math.abs(p.aos - r.aos) < 20 * 60_000);
    if (!matching || (settings.opticalOnly && !matching.optical)) {
      await cancelReminder(r.id);
      continue;
    }
    await cancelReminder(r.id);
    await scheduleReminder(
      object,
      matching,
      { ...settings, minElevation: r.minElevation, leadMinutes: r.leadMinutes },
      false,
    );
  }
}

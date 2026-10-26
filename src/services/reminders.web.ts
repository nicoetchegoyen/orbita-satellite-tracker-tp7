import type { OrbitalObject, SatellitePass, Settings } from '../core/types';
export interface Reminder {
  id: string;
  notificationId: string;
  object: OrbitalObject;
  aos: number;
  los: number;
  leadMinutes: number;
  minElevation: number;
}
export async function listReminders(): Promise<Reminder[]> {
  return [];
}
export async function scheduleReminder(_o: OrbitalObject, _p: SatellitePass, _s: Settings) {
  throw new Error(
    'Los avisos programados requieren la app Android/iOS. En web podés explorar y calcular pases.',
  );
}
export async function cancelReminder(_id: string) {}
export async function refreshReminders(_s: Settings) {}
export async function testNotification() {
  if (!('Notification' in globalThis))
    return 'Vista previa de aviso: Satellite Tracker · próximo pase. Los avisos del sistema requieren Android/iOS.';
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission === 'granted') {
    new Notification('Satellite Tracker · prueba', {
      body: 'El próximo pase está a un aviso de distancia.',
    });
    return 'Notificación de prueba enviada al navegador.';
  }
  return 'Vista previa de aviso: Satellite Tracker · próximo pase. Habilitá notificaciones o probá en Android/iOS.';
}

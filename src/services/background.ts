import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSettings } from './settings';
import { refreshReminders, listReminders } from './reminders';
import { loadCatalog } from '../data/client';
const TASK = 'satellite-tracker-refresh';
TaskManager.defineTask(TASK, async () => {
  try {
    const settings = await readSettings();
    const reminders = await listReminders();
    const selected = JSON.parse((await AsyncStorage.getItem('selected-object')) || 'null');
    const groups = new Set([
      selected?.group || 'stations',
      ...reminders.map((r) => r.object.group),
    ]);
    for (const group of groups) await loadCatalog(group);
    await refreshReminders(settings);
    await AsyncStorage.setItem('background-last-run', String(Date.now()));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
export async function configureBackground(enabled: boolean) {
  if (enabled) {
    if (!(await TaskManager.isAvailableAsync()))
      throw new Error('El refresco en segundo plano requiere un build nativo compatible.');
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available)
      throw new Error(
        'El sistema restringe las tareas en segundo plano. Revisá los ajustes de batería.',
      );
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 60 });
  } else if (await TaskManager.isTaskRegisteredAsync(TASK))
    await BackgroundTask.unregisterTaskAsync(TASK);
}

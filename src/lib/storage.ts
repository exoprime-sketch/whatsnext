import { sampleTasks } from '../data/sampleTasks';
import type { StoredAppData } from '../types';
import { normalizeTasksForToday } from './tasks';

const STORAGE_KEY = 'whatsnext.v0.1';

export function loadAppData(now: Date): StoredAppData {
  const emptyState: StoredAppData = {
    version: '0.1',
    tasks: sampleTasks(now),
    logs: []
  };

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAppData>;
    const tasks = Array.isArray(parsed.tasks) ? normalizeTasksForToday(parsed.tasks, now) : emptyState.tasks;
    const logs = Array.isArray(parsed.logs) ? parsed.logs : [];

    return {
      version: '0.1',
      tasks,
      logs
    };
  } catch {
    return emptyState;
  }
}

export function saveAppData(data: StoredAppData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAppData() {
  window.localStorage.removeItem(STORAGE_KEY);
}

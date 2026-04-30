import { sampleTasks } from '../data/sampleTasks';
import type { ActivityLog, StoredAppData } from '../types';
import { normalizeStoredTask, normalizeTasksForToday } from './tasks';

const STORAGE_KEY = 'whatsnext.v0.1';

function normalizeLogs(logs: unknown): ActivityLog[] {
  if (!Array.isArray(logs)) {
    return [];
  }

  return logs
    .filter((item): item is Partial<ActivityLog> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      taskId: typeof item.taskId === 'string' ? item.taskId : undefined,
      type:
        item.type === 'completed' ||
        item.type === 'snoozed' ||
        item.type === 'excludedToday' ||
        item.type === 'negativeFeedback' ||
        item.type === 'edited' ||
        item.type === 'deleted' ||
        item.type === 'restoredSamples' ||
        item.type === 'clearedAll' ||
        item.type === 'captured'
          ? item.type
          : 'created',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      meta: typeof item.meta === 'string' ? item.meta : undefined
    }));
}

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
    const parsedTasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .map((task) => normalizeStoredTask(task))
          .filter((task): task is NonNullable<typeof task> => Boolean(task))
      : emptyState.tasks;
    const tasks = normalizeTasksForToday(parsedTasks, now);
    const logs = normalizeLogs(parsed.logs);

    return {
      version: '0.1',
      tasks: tasks.length > 0 ? tasks : emptyState.tasks,
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

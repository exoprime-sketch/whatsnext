import type { ActivityLog, Task, TaskDraft, TaskFeedbackType, TaskSource } from '../types';
import { toDateKey } from './time';

export const DEFAULT_TASK_DRAFT: TaskDraft = {
  title: '',
  memo: '',
  durationMinutes: 15,
  importance: 'medium',
  due: 'none',
  preferredTime: 'anytime'
};

export function createTaskFromDraft(
  draft: TaskDraft,
  now: Date,
  source: TaskSource = 'manual'
): Task {
  return {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    memo: draft.memo.trim(),
    durationMinutes: draft.durationMinutes,
    importance: draft.importance,
    due: draft.due,
    preferredTime: draft.preferredTime,
    status: 'active',
    snoozeCount: 0,
    negativeFeedbackCount: 0,
    createdAt: now.toISOString(),
    excludedToday: false,
    source
  };
}

export function normalizeTasksForToday(tasks: Task[], now: Date) {
  const todayKey = toDateKey(now);
  let changed = false;

  const normalized = tasks.map((task) => {
    let nextTask = task;

    if (task.excludedToday && task.excludedOnDate !== todayKey) {
      nextTask = {
        ...nextTask,
        excludedToday: false,
        excludedOnDate: undefined
      };
      changed = true;
    }

    if (
      task.snoozeUntil &&
      new Date(task.snoozeUntil).getTime() <= now.getTime() &&
      nextTask.snoozeUntil
    ) {
      nextTask = {
        ...nextTask,
        snoozeUntil: undefined
      };
      changed = true;
    }

    return nextTask;
  });

  return changed ? normalized : tasks;
}

export function createLog(
  type: ActivityLog['type'],
  now: Date,
  taskId?: string,
  meta?: string
): ActivityLog {
  return {
    id: crypto.randomUUID(),
    taskId,
    type,
    createdAt: now.toISOString(),
    meta
  };
}

export function applyFeedback(
  task: Task,
  now: Date,
  feedbackType: TaskFeedbackType,
  extra: Partial<Task> = {}
): Task {
  return {
    ...task,
    lastFeedbackAt: now.toISOString(),
    lastFeedbackType: feedbackType,
    ...extra
  };
}

export function getPostponeWeight(task: Task) {
  return task.snoozeCount + task.negativeFeedbackCount + (task.excludedToday ? 1 : 0);
}

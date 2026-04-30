import type { ActivityLog, Task, TaskDraft, TaskFeedbackType, TaskSource } from '../types';
import { toDateKey } from './time';

export const DEFAULT_TASK_DRAFT: TaskDraft = {
  title: '',
  memo: '',
  durationMinutes: 15,
  importance: 'medium',
  due: 'none',
  preferredTime: 'anytime',
  itemType: 'task'
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
    itemType: draft.itemType,
    dateLabel: draft.dateLabel?.trim() || undefined,
    timeLabel: draft.timeLabel?.trim() || undefined,
    personLabel: draft.personLabel?.trim() || undefined,
    locationLabel: draft.locationLabel?.trim() || undefined,
    status: 'active',
    snoozeCount: 0,
    negativeFeedbackCount: 0,
    createdAt: now.toISOString(),
    excludedToday: false,
    source
  };
}

export function normalizeStoredTask(task: Partial<Task>): Task | null {
  if (typeof task.title !== 'string' || !task.title.trim()) {
    return null;
  }

  return {
    id: typeof task.id === 'string' && task.id ? task.id : crypto.randomUUID(),
    title: task.title.trim(),
    memo: typeof task.memo === 'string' ? task.memo.trim() : '',
    durationMinutes: [5, 10, 15, 30, 60].includes(task.durationMinutes as number)
      ? (task.durationMinutes as Task['durationMinutes'])
      : DEFAULT_TASK_DRAFT.durationMinutes,
    importance: task.importance === 'high' || task.importance === 'low' ? task.importance : 'medium',
    due:
      task.due === 'today' || task.due === 'tomorrow' || task.due === 'thisWeek' ? task.due : 'none',
    preferredTime:
      task.preferredTime === 'morning' ||
      task.preferredTime === 'afternoon' ||
      task.preferredTime === 'evening'
        ? task.preferredTime
        : 'anytime',
    itemType:
      task.itemType === 'event' || task.itemType === 'reminder'
        ? task.itemType
        : DEFAULT_TASK_DRAFT.itemType,
    dateLabel: typeof task.dateLabel === 'string' && task.dateLabel.trim() ? task.dateLabel.trim() : undefined,
    timeLabel: typeof task.timeLabel === 'string' && task.timeLabel.trim() ? task.timeLabel.trim() : undefined,
    personLabel:
      typeof task.personLabel === 'string' && task.personLabel.trim() ? task.personLabel.trim() : undefined,
    locationLabel:
      typeof task.locationLabel === 'string' && task.locationLabel.trim() ? task.locationLabel.trim() : undefined,
    status: task.status === 'completed' ? 'completed' : 'active',
    snoozeCount: Number.isFinite(task.snoozeCount) ? Number(task.snoozeCount) : 0,
    negativeFeedbackCount: Number.isFinite(task.negativeFeedbackCount) ? Number(task.negativeFeedbackCount) : 0,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : undefined,
    excludedToday: Boolean(task.excludedToday),
    excludedOnDate: typeof task.excludedOnDate === 'string' ? task.excludedOnDate : undefined,
    lastFeedbackAt: typeof task.lastFeedbackAt === 'string' ? task.lastFeedbackAt : undefined,
    lastFeedbackType:
      task.lastFeedbackType === 'negative' ||
      task.lastFeedbackType === 'skipToday' ||
      task.lastFeedbackType === 'snooze'
        ? task.lastFeedbackType
        : undefined,
    snoozeUntil: typeof task.snoozeUntil === 'string' ? task.snoozeUntil : undefined,
    source: task.source === 'capture' || task.source === 'sample' ? task.source : 'manual'
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

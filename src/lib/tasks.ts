import type {
  ActivityLog,
  ConfidenceLevel,
  ItemType,
  Task,
  TaskDraft,
  TaskFeedbackType,
  TaskSource
} from '../types';
import { extractTemporalInfo, resolveTemporalInfo, toDateKey } from './time';

type DraftLike = Pick<
  TaskDraft,
  | 'title'
  | 'memo'
  | 'durationMinutes'
  | 'importance'
  | 'due'
  | 'preferredTime'
  | 'itemType'
  | 'dateText'
  | 'timeText'
  | 'parsedDate'
  | 'parsedTime'
  | 'parsedDateTime'
  | 'locationText'
  | 'personText'
  | 'originalText'
  | 'confidence'
  | 'alarmEnabled'
  | 'alarmBeforeMinutes'
  | 'alarmLabel'
  | 'alarmNeedsReview'
  | 'calendarReady'
  | 'calendarExportedAt'
  | 'icsDownloadCount'
  | 'copiedDetailsCount'
  | 'needsDateReview'
  | 'needsTimeReview'
>;

const CONFIDENCE_LABELS: ConfidenceLevel[] = ['low', 'medium', 'high'];

export const DEFAULT_TASK_DRAFT: TaskDraft = {
  title: '',
  memo: '',
  durationMinutes: 15,
  importance: 'medium',
  due: 'none',
  preferredTime: 'anytime',
  itemType: 'task',
  alarmEnabled: false,
  alarmBeforeMinutes: null,
  alarmLabel: 'No alarm',
  alarmNeedsReview: false,
  calendarReady: false,
  needsDateReview: false,
  needsTimeReview: false
};

function normalizeConfidence(value: unknown): ConfidenceLevel | undefined {
  if (typeof value === 'string' && CONFIDENCE_LABELS.includes(value as ConfidenceLevel)) {
    return value as ConfidenceLevel;
  }

  if (typeof value === 'number') {
    if (value >= 0.8) {
      return 'high';
    }

    if (value >= 0.65) {
      return 'medium';
    }

    return 'low';
  }

  return undefined;
}

function normalizeText(value: string | undefined) {
  const next = value?.trim();
  return next ? next : undefined;
}

function isEventLikeText(text: string) {
  return /\b(meeting|call|sync|check-in|check in|interview)\b/i.test(text);
}

function isSocialEventText(text: string) {
  return /\b(dinner|lunch|coffee|breakfast|appointment|doctor|dentist)\b/i.test(text);
}

function isDeadlineText(text: string) {
  return /\b(deadline|submit|send|file|pay|by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today))\b/i.test(
    text
  );
}

function isReminderText(text: string) {
  return /\b(remember|don't forget|dont forget|bring|buy|pick up|follow up|follow-up)\b/i.test(text);
}

export function getAlarmLabel(beforeMinutes: number | null | undefined, enabled = true) {
  if (!enabled || beforeMinutes == null) {
    return 'No alarm';
  }

  if (beforeMinutes === 0) {
    return 'At time';
  }

  if (beforeMinutes === 10) {
    return '10 minutes before';
  }

  if (beforeMinutes === 30) {
    return '30 minutes before';
  }

  if (beforeMinutes === 60) {
    return '1 hour before';
  }

  if (beforeMinutes === 1440) {
    return '1 day before';
  }

  return `${beforeMinutes} minutes before`;
}

function getDefaultAlarmState(
  draft: DraftLike
): Pick<TaskDraft, 'alarmEnabled' | 'alarmBeforeMinutes' | 'alarmLabel' | 'alarmNeedsReview'> {
  const text = [draft.title, draft.memo, draft.originalText].filter(Boolean).join(' ');

  if (!draft.parsedDate && !draft.dateText) {
    return {
      alarmEnabled: false,
      alarmBeforeMinutes: null,
      alarmLabel: 'No alarm',
      alarmNeedsReview: false
    };
  }

  if (!draft.parsedDateTime) {
    if (isDeadlineText(text) && draft.parsedDate) {
      return {
        alarmEnabled: true,
        alarmBeforeMinutes: 1440,
        alarmLabel: getAlarmLabel(1440),
        alarmNeedsReview: false
      };
    }

    return {
      alarmEnabled: false,
      alarmBeforeMinutes: null,
      alarmLabel: draft.needsTimeReview ? 'Needs time review' : 'No alarm',
      alarmNeedsReview: Boolean(draft.needsTimeReview || draft.needsDateReview)
    };
  }

  let defaultMinutes = 30;

  if (isEventLikeText(text)) {
    defaultMinutes = 10;
  } else if (isSocialEventText(text)) {
    defaultMinutes = 60;
  } else if (isDeadlineText(text)) {
    defaultMinutes = 1440;
  } else if (isReminderText(text)) {
    defaultMinutes = 0;
  }

  return {
    alarmEnabled: true,
    alarmBeforeMinutes: defaultMinutes,
    alarmLabel: getAlarmLabel(defaultMinutes),
    alarmNeedsReview: false
  };
}

export function supportsAlarmSelection(
  task: Pick<TaskDraft, 'itemType' | 'due' | 'parsedDate' | 'parsedDateTime' | 'dateText'>
) {
  return task.itemType !== 'task' || task.due !== 'none' || Boolean(task.parsedDate || task.parsedDateTime || task.dateText);
}

export function isCalendarRelevantItem(
  task: Pick<TaskDraft, 'itemType' | 'parsedDate' | 'dateText' | 'parsedDateTime'>
) {
  return task.itemType !== 'task' || Boolean(task.parsedDate || task.parsedDateTime || task.dateText);
}

export function applyDraftScheduling<T extends DraftLike>(draft: T, now: Date) {
  const derivedTemporal =
    draft.dateText || draft.timeText
      ? resolveTemporalInfo(draft.dateText, draft.timeText, now)
      : draft.originalText
        ? extractTemporalInfo(draft.originalText, now)
        : resolveTemporalInfo(undefined, undefined, now);

  const dateText = normalizeText(draft.dateText ?? derivedTemporal.dateText);
  const timeText = normalizeText(draft.timeText ?? derivedTemporal.timeText);
  const parsedDate = draft.parsedDate ?? derivedTemporal.parsedDate;
  const parsedTime = draft.parsedTime ?? derivedTemporal.parsedTime;
  const parsedDateTime = draft.parsedDateTime ?? derivedTemporal.parsedDateTime;
  const inferredDue = derivedTemporal.due !== 'none' ? derivedTemporal.due : draft.due;
  const inferredPreferredTime =
    derivedTemporal.preferredTime !== 'anytime' ? derivedTemporal.preferredTime : draft.preferredTime;

  let needsDateReview = Boolean(draft.needsDateReview ?? derivedTemporal.needsDateReview);
  let needsTimeReview = Boolean(draft.needsTimeReview ?? derivedTemporal.needsTimeReview);

  if ((draft.itemType === 'event' || draft.itemType === 'reminder') && !parsedDate) {
    needsDateReview = Boolean(dateText) || draft.itemType === 'event';
  }

  if ((draft.itemType === 'event' || draft.itemType === 'reminder') && parsedDate && !parsedTime) {
    needsTimeReview = true;
  }

  if (draft.itemType === 'task' && parsedDate && !timeText) {
    needsTimeReview = false;
  }

  const calendarReady = Boolean((draft.itemType === 'event' || draft.itemType === 'reminder') && parsedDateTime);

  const baseDraft: TaskDraft = {
    ...draft,
    title: draft.title.trim(),
    memo: draft.memo.trim(),
    due: inferredDue,
    preferredTime: inferredPreferredTime,
    dateText,
    timeText,
    parsedDate,
    parsedTime,
    parsedDateTime,
    locationText: normalizeText(draft.locationText),
    personText: normalizeText(draft.personText),
    originalText: normalizeText(draft.originalText),
    confidence: draft.confidence,
    needsDateReview,
    needsTimeReview,
    calendarReady,
    calendarExportedAt: draft.calendarExportedAt,
    icsDownloadCount: draft.icsDownloadCount ?? 0,
    copiedDetailsCount: draft.copiedDetailsCount ?? 0
  };

  const hasExplicitAlarmPreference =
    draft.alarmEnabled !== undefined || draft.alarmBeforeMinutes !== undefined || Boolean(draft.alarmLabel);
  const defaultAlarm = getDefaultAlarmState(baseDraft);

  return {
    ...baseDraft,
    alarmEnabled: hasExplicitAlarmPreference ? draft.alarmEnabled ?? false : defaultAlarm.alarmEnabled,
    alarmBeforeMinutes: hasExplicitAlarmPreference
      ? draft.alarmBeforeMinutes ?? null
      : defaultAlarm.alarmBeforeMinutes,
    alarmLabel: hasExplicitAlarmPreference
      ? draft.alarmLabel ?? getAlarmLabel(draft.alarmBeforeMinutes, draft.alarmEnabled)
      : defaultAlarm.alarmLabel,
    alarmNeedsReview: hasExplicitAlarmPreference
      ? Boolean(draft.alarmNeedsReview ?? (!parsedDateTime && (needsDateReview || needsTimeReview)))
      : defaultAlarm.alarmNeedsReview
  };
}

export function createTaskFromDraft(draft: TaskDraft, now: Date, source: TaskSource = 'manual'): Task {
  const normalizedDraft = applyDraftScheduling(draft, now);

  return {
    id: crypto.randomUUID(),
    ...normalizedDraft,
    status: 'active',
    snoozeCount: 0,
    negativeFeedbackCount: 0,
    createdAt: now.toISOString(),
    excludedToday: false,
    source
  };
}

export function normalizeStoredTask(task: Partial<Task>): Task | null {
  const legacyTask = task as Partial<Task> & {
    dateLabel?: string;
    timeLabel?: string;
    personLabel?: string;
    locationLabel?: string;
    rawText?: string;
    confidence?: number | ConfidenceLevel;
  };

  if (typeof task.title !== 'string' || !task.title.trim()) {
    return null;
  }

  const baseDraft = applyDraftScheduling(
    {
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
      itemType: task.itemType === 'event' || task.itemType === 'reminder' ? task.itemType : 'task',
      dateText: normalizeText(task.dateText) ?? normalizeText(legacyTask.dateLabel),
      timeText: normalizeText(task.timeText) ?? normalizeText(legacyTask.timeLabel),
      parsedDate: normalizeText(task.parsedDate),
      parsedTime: normalizeText(task.parsedTime),
      parsedDateTime: normalizeText(task.parsedDateTime),
      locationText: normalizeText(task.locationText) ?? normalizeText(legacyTask.locationLabel),
      personText: normalizeText(task.personText) ?? normalizeText(legacyTask.personLabel),
      originalText: normalizeText(task.originalText) ?? normalizeText(legacyTask.rawText),
      confidence: normalizeConfidence(legacyTask.confidence),
      alarmEnabled: typeof task.alarmEnabled === 'boolean' ? task.alarmEnabled : undefined,
      alarmBeforeMinutes: typeof task.alarmBeforeMinutes === 'number' ? task.alarmBeforeMinutes : null,
      alarmLabel: normalizeText(task.alarmLabel),
      alarmNeedsReview: typeof task.alarmNeedsReview === 'boolean' ? task.alarmNeedsReview : undefined,
      calendarReady: typeof task.calendarReady === 'boolean' ? task.calendarReady : undefined,
      calendarExportedAt: normalizeText(task.calendarExportedAt),
      icsDownloadCount: Number.isFinite(task.icsDownloadCount) ? Number(task.icsDownloadCount) : 0,
      copiedDetailsCount: Number.isFinite(task.copiedDetailsCount) ? Number(task.copiedDetailsCount) : 0,
      needsDateReview: typeof task.needsDateReview === 'boolean' ? task.needsDateReview : undefined,
      needsTimeReview: typeof task.needsTimeReview === 'boolean' ? task.needsTimeReview : undefined
    },
    typeof task.createdAt === 'string' ? new Date(task.createdAt) : new Date()
  );

  return {
    id: typeof task.id === 'string' && task.id ? task.id : crypto.randomUUID(),
    ...baseDraft,
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

    if (task.snoozeUntil && new Date(task.snoozeUntil).getTime() <= now.getTime() && nextTask.snoozeUntil) {
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

export function createLog(type: ActivityLog['type'], now: Date, taskId?: string, meta?: string): ActivityLog {
  return {
    id: crypto.randomUUID(),
    taskId,
    type,
    createdAt: now.toISOString(),
    meta
  };
}

export function applyFeedback(task: Task, now: Date, feedbackType: TaskFeedbackType, extra: Partial<Task> = {}): Task {
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

export function incrementCalendarExport(task: Task, now: Date) {
  return {
    ...task,
    calendarExportedAt: now.toISOString(),
    icsDownloadCount: (task.icsDownloadCount ?? 0) + 1
  };
}

export function incrementCopiedDetails(task: Task) {
  return {
    ...task,
    copiedDetailsCount: (task.copiedDetailsCount ?? 0) + 1
  };
}

export function updateAlarmPreference<
  T extends Pick<TaskDraft, 'parsedDateTime' | 'needsDateReview' | 'needsTimeReview'> & {
    alarmEnabled?: boolean;
    alarmBeforeMinutes?: number | null;
    alarmLabel?: string;
    alarmNeedsReview?: boolean;
  }
>(item: T, alarmEnabled: boolean, alarmBeforeMinutes: number | null) {
  return {
    ...item,
    alarmEnabled,
    alarmBeforeMinutes,
    alarmLabel: getAlarmLabel(alarmBeforeMinutes, alarmEnabled),
    alarmNeedsReview: !alarmEnabled ? false : Boolean(!item.parsedDateTime && (item.needsDateReview || item.needsTimeReview))
  };
}

export type Importance = 'low' | 'medium' | 'high';
export type DueBucket = 'today' | 'tomorrow' | 'thisWeek' | 'none';
export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type TaskStatus = 'active' | 'completed';
export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'night';
export type TaskFeedbackType = 'snooze' | 'skipToday' | 'negative';
export type TaskSource = 'manual' | 'capture' | 'sample';
export type AppView =
  | 'today'
  | 'add'
  | 'list'
  | 'capture'
  | 'settings';
export type TaskFilter = 'all' | 'today' | 'completed' | 'postponed';

export interface TaskDraft {
  title: string;
  memo: string;
  durationMinutes: 5 | 10 | 15 | 30 | 60;
  importance: Importance;
  due: DueBucket;
  preferredTime: PreferredTime;
}

export interface Task extends TaskDraft {
  id: string;
  status: TaskStatus;
  snoozeCount: number;
  negativeFeedbackCount: number;
  createdAt: string;
  completedAt?: string;
  excludedToday: boolean;
  excludedOnDate?: string;
  lastFeedbackAt?: string;
  lastFeedbackType?: TaskFeedbackType;
  snoozeUntil?: string;
  source: TaskSource;
}

export interface ActivityLog {
  id: string;
  taskId?: string;
  type:
    | 'created'
    | 'completed'
    | 'snoozed'
    | 'excludedToday'
    | 'negativeFeedback'
    | 'edited'
    | 'deleted'
    | 'restoredSamples'
    | 'clearedAll'
    | 'captured';
  createdAt: string;
  meta?: string;
}

export interface StoredAppData {
  version: string;
  tasks: Task[];
  logs: ActivityLog[];
}

export interface RecommendationResult {
  task: Task | null;
  score: number;
  reasons: string[];
}

export interface CaptureCandidate extends TaskDraft {
  id: string;
  rawText: string;
  selected: boolean;
}

export type QAEventName =
  | 'app_open'
  | 'standalone_open'
  | 'first_task_created'
  | 'task_created'
  | 'now_card_viewed'
  | 'now_card_done'
  | 'now_card_later'
  | 'now_card_not_today'
  | 'now_card_changed'
  | 'capture_opened'
  | 'capture_pasted'
  | 'capture_candidate_saved'
  | 'settings_opened'
  | 'data_reset'
  | 'sample_tasks_restored';

export type QARating = 'Clear' | 'Useful' | 'Annoying' | 'Confusing' | 'Worth keeping';
export type DisplayMode = 'standalone' | 'browser';

export interface QAEventMetadata {
  taskCount?: number;
  activeTaskCount?: number;
  completedTaskCount?: number;
  nowTaskId?: string;
  previousNowTaskId?: string;
  captureCandidateCount?: number;
  displayMode?: DisplayMode;
  source?: TaskSource;
}

export interface QAEvent {
  id: string;
  eventName: QAEventName;
  timestamp: string;
  dateKey: string;
  metadata?: QAEventMetadata;
}

export interface QAFeedback {
  id: string;
  timestamp: string;
  dateKey: string;
  note: string;
  rating?: QARating;
}

export interface QAData {
  events: QAEvent[];
  feedback: QAFeedback[];
}

export interface QASummary {
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  activeDays: number;
  totalAppOpens: number;
  standaloneOpens: number;
  totalTasksCreated: number;
  totalDoneClicks: number;
  totalLaterClicks: number;
  totalNotTodayClicks: number;
  captureOpenedCount: number;
  captureSavedCount: number;
  returnedOnDay2: boolean;
  returnedOnDay3: boolean;
  currentActiveTaskCount: number;
  currentCompletedTaskCount: number;
}

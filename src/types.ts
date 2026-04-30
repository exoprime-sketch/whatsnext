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

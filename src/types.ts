export type Importance = 'low' | 'medium' | 'high';
export type DueBucket = 'today' | 'tomorrow' | 'thisWeek' | 'none';
export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type TaskStatus = 'active' | 'completed';
export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'night';
export type TaskFeedbackType = 'snooze' | 'skipToday' | 'negative';
export type TaskSource = 'manual' | 'capture' | 'sample';
export type ItemType = 'task' | 'event' | 'reminder';
export type AppView = 'today' | 'calendar' | 'import' | 'inbox' | 'settings';
export type TaskFilter = 'all' | 'today' | 'completed' | 'postponed';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AlarmState {
  alarmEnabled?: boolean;
  alarmBeforeMinutes?: number | null;
  alarmLabel?: string;
  alarmNeedsReview?: boolean;
}

export interface CalendarState {
  calendarReady?: boolean;
  calendarExportedAt?: string;
  icsDownloadCount?: number;
  copiedDetailsCount?: number;
}

export interface ReviewState {
  needsDateReview?: boolean;
  needsTimeReview?: boolean;
}

export interface TaskDraft extends AlarmState, CalendarState, ReviewState {
  title: string;
  memo: string;
  durationMinutes: 5 | 10 | 15 | 30 | 60;
  importance: Importance;
  due: DueBucket;
  preferredTime: PreferredTime;
  itemType: ItemType;
  dateText?: string;
  timeText?: string;
  parsedDate?: string;
  parsedTime?: string;
  parsedDateTime?: string;
  locationText?: string;
  personText?: string;
  originalText?: string;
  confidence?: ConfidenceLevel;
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
  selected: boolean;
}

export type QAEventName =
  | 'app_open'
  | 'standalone_open'
  | 'manual_task_created'
  | 'item_marked_done'
  | 'now_card_viewed'
  | 'now_card_later'
  | 'now_card_not_today'
  | 'now_card_changed'
  | 'capture_opened'
  | 'extraction_run'
  | 'capture_items_saved'
  | 'used_manual_add_after_capture'
  | 'alarm_option_selected'
  | 'calendar_export_available'
  | 'calendar_file_downloaded'
  | 'event_details_copied'
  | 'item_marked_needs_review'
  | 'upcoming_viewed'
  | 'date_review_completed'
  | 'time_review_completed'
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
  detectedItemsCount?: number;
  savedDetectedItemsCount?: number;
  extractedTaskCount?: number;
  extractedEventCount?: number;
  extractedReminderCount?: number;
  savedTaskCount?: number;
  savedEventCount?: number;
  savedReminderCount?: number;
  manualEntriesAvoidedApprox?: number;
  calendarReadyCount?: number;
  calendarExportCount?: number;
  eventDetailsCopiedCount?: number;
  itemsNeedingDateReviewCount?: number;
  itemsNeedingTimeReviewCount?: number;
  alarmSelectionCount?: number;
  displayMode?: DisplayMode;
  source?: TaskSource;
  itemType?: ItemType;
  alarmBeforeMinutes?: number | null;
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
  totalDoneClicks: number;
  totalLaterClicks: number;
  totalNotTodayClicks: number;
  captureOpenedCount: number;
  extractionRuns: number;
  detectedItemsCount: number;
  savedDetectedItemsCount: number;
  manualTaskCreatedCount: number;
  manualEntriesAvoidedApprox: number;
  captureSavedTaskCount: number;
  captureSavedEventCount: number;
  captureSavedReminderCount: number;
  captureToSaveConversion: number;
  usedManualAddAfterCaptureCount: number;
  eventDetections: number;
  reminderDetections: number;
  calendarReadyItems: number;
  calendarExports: number;
  copiedEventDetails: number;
  itemsNeedingDateReview: number;
  itemsNeedingTimeReview: number;
  alarmSelections: number;
  upcomingViewedCount: number;
  returnedOnDay2: boolean;
  returnedOnDay3: boolean;
  currentActiveTaskCount: number;
  currentCompletedTaskCount: number;
  currentTaskCount: number;
  currentEventCount: number;
  currentReminderCount: number;
  captureVsManualRatio: string;
}

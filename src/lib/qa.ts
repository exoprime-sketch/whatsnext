import type {
  DisplayMode,
  QAData,
  QAEvent,
  QAEventMetadata,
  QAEventName,
  QAFeedback,
  QARating,
  QASummary,
  Task
} from '../types';
import { toDateKey } from './time';

const QA_MODE_KEY = 'whatsnext.qaMode';
const QA_DATA_KEY = 'whatsnext.qa.v1';

const EMPTY_QA_DATA: QAData = {
  events: [],
  feedback: []
};

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function readRawQAData() {
  const raw = window.localStorage.getItem(QA_DATA_KEY);

  if (!raw) {
    return EMPTY_QA_DATA;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<QAData>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : []
    };
  } catch {
    return EMPTY_QA_DATA;
  }
}

function eventMatches(event: QAEvent, names: QAEventName[]) {
  return names.includes(event.eventName);
}

function countEvents(events: QAEvent[], names: QAEventName[]) {
  return events.filter((event) => eventMatches(event, names)).length;
}

function sumMetadata(events: QAEvent[], names: QAEventName[], key: keyof QAEventMetadata) {
  return events
    .filter((event) => eventMatches(event, names))
    .reduce((total, event) => total + Number(event.metadata?.[key] ?? 0), 0);
}

export function getDisplayMode(): DisplayMode {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  if (window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone) {
    return 'standalone';
  }

  return 'browser';
}

export function initializeQAMode() {
  const params = new URLSearchParams(window.location.search);
  const shouldEnable = params.get('qa') === '1';

  if (shouldEnable) {
    window.localStorage.setItem(QA_MODE_KEY, 'true');
  }

  return shouldEnable || window.localStorage.getItem(QA_MODE_KEY) === 'true';
}

export function setQAModeEnabled(enabled: boolean) {
  if (enabled) {
    window.localStorage.setItem(QA_MODE_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(QA_MODE_KEY);
}

export function removeQAQueryFlag() {
  const url = new URL(window.location.href);
  url.searchParams.delete('qa');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function loadQAData(): QAData {
  return readRawQAData();
}

export function saveQAData(data: QAData) {
  window.localStorage.setItem(QA_DATA_KEY, JSON.stringify(data));
}

export function createQAEvent(eventName: QAEventName, timestamp: Date, metadata?: QAEventMetadata): QAEvent {
  return {
    id: crypto.randomUUID(),
    eventName,
    timestamp: timestamp.toISOString(),
    dateKey: toDateKey(timestamp),
    metadata
  };
}

export function createQAFeedback(note: string, rating: QARating | '', timestamp: Date): QAFeedback {
  return {
    id: crypto.randomUUID(),
    timestamp: timestamp.toISOString(),
    dateKey: toDateKey(timestamp),
    note: note.trim(),
    rating: rating || undefined
  };
}

function formatRatio(captureCount: number, manualCount: number) {
  return `${captureCount}:${manualCount}`;
}

export function buildQASummary(events: QAEvent[], tasks: Task[]): QASummary {
  const openEvents = events.filter((event) => event.eventName === 'app_open');
  const fallbackEvents = openEvents.length > 0 ? openEvents : events;
  const firstOpenAt = fallbackEvents.length > 0 ? fallbackEvents[fallbackEvents.length - 1].timestamp : null;
  const lastOpenAt = fallbackEvents.length > 0 ? fallbackEvents[0].timestamp : null;
  const openDateKeys = [...new Set(openEvents.map((event) => event.dateKey))];
  const firstOpenDateKey = openDateKeys[0] ?? null;

  const extractionRuns = countEvents(events, ['extraction_run']);
  const detectedItemsCount = sumMetadata(events, ['extraction_run'], 'detectedItemsCount');
  const savedDetectedItemsCount = sumMetadata(events, ['capture_items_saved'], 'savedDetectedItemsCount');
  const manualTaskCreatedCount = countEvents(events, ['manual_task_created']);
  const captureSavedTaskCount = sumMetadata(events, ['capture_items_saved'], 'savedTaskCount');
  const captureSavedEventCount = sumMetadata(events, ['capture_items_saved'], 'savedEventCount');
  const captureSavedReminderCount = sumMetadata(events, ['capture_items_saved'], 'savedReminderCount');
  const manualEntriesAvoidedApprox = sumMetadata(events, ['capture_items_saved'], 'manualEntriesAvoidedApprox');
  const eventDetections = sumMetadata(events, ['extraction_run'], 'extractedEventCount');
  const reminderDetections = sumMetadata(events, ['extraction_run'], 'extractedReminderCount');
  const calendarReadyItems =
    tasks.filter((task) => task.calendarReady).length + sumMetadata(events, ['calendar_export_available'], 'calendarReadyCount');

  return {
    firstOpenAt,
    lastOpenAt,
    activeDays: openDateKeys.length,
    totalAppOpens: openEvents.length,
    standaloneOpens: countEvents(events, ['standalone_open']),
    totalDoneClicks: countEvents(events, ['item_marked_done']),
    totalLaterClicks: countEvents(events, ['now_card_later']),
    totalNotTodayClicks: countEvents(events, ['now_card_not_today']),
    captureOpenedCount: countEvents(events, ['capture_opened']),
    extractionRuns,
    detectedItemsCount,
    savedDetectedItemsCount,
    manualTaskCreatedCount,
    manualEntriesAvoidedApprox,
    captureSavedTaskCount,
    captureSavedEventCount,
    captureSavedReminderCount,
    captureToSaveConversion: detectedItemsCount > 0 ? savedDetectedItemsCount / detectedItemsCount : 0,
    usedManualAddAfterCaptureCount: countEvents(events, ['used_manual_add_after_capture']),
    eventDetections,
    reminderDetections,
    calendarReadyItems,
    calendarExports: countEvents(events, ['calendar_file_downloaded']),
    copiedEventDetails: countEvents(events, ['event_details_copied']),
    itemsNeedingDateReview: sumMetadata(events, ['item_marked_needs_review'], 'itemsNeedingDateReviewCount'),
    itemsNeedingTimeReview: sumMetadata(events, ['item_marked_needs_review'], 'itemsNeedingTimeReviewCount'),
    alarmSelections: countEvents(events, ['alarm_option_selected']),
    upcomingViewedCount: countEvents(events, ['upcoming_viewed']),
    returnedOnDay2: firstOpenDateKey ? openDateKeys.includes(addDays(firstOpenDateKey, 1)) : false,
    returnedOnDay3: firstOpenDateKey ? openDateKeys.includes(addDays(firstOpenDateKey, 2)) : false,
    currentActiveTaskCount: tasks.filter((task) => task.status === 'active').length,
    currentCompletedTaskCount: tasks.filter((task) => task.status === 'completed').length,
    currentTaskCount: tasks.filter((task) => task.itemType === 'task').length,
    currentEventCount: tasks.filter((task) => task.itemType === 'event').length,
    currentReminderCount: tasks.filter((task) => task.itemType === 'reminder').length,
    captureVsManualRatio: formatRatio(savedDetectedItemsCount, manualTaskCreatedCount)
  };
}

export function buildQASummaryText(summary: QASummary, feedback: QAFeedback[]) {
  const lines = [
    "What's Next Founder QA Summary",
    `First open: ${summary.firstOpenAt ?? 'n/a'}`,
    `Last open: ${summary.lastOpenAt ?? 'n/a'}`,
    `Active days: ${summary.activeDays}`,
    `Opens: ${summary.totalAppOpens}`,
    `Standalone opens: ${summary.standaloneOpens}`,
    `Capture opened: ${summary.captureOpenedCount}`,
    `Extraction runs: ${summary.extractionRuns}`,
    `Detected items: ${summary.detectedItemsCount}`,
    `Saved detected items: ${summary.savedDetectedItemsCount}`,
    `Manual entries avoided approx: ${summary.manualEntriesAvoidedApprox}`,
    `Manual adds: ${summary.manualTaskCreatedCount}`,
    `Capture vs manual ratio: ${summary.captureVsManualRatio}`,
    `Capture-to-save conversion: ${Math.round(summary.captureToSaveConversion * 100)}%`,
    `Saved tasks: ${summary.captureSavedTaskCount}`,
    `Saved events: ${summary.captureSavedEventCount}`,
    `Saved reminders: ${summary.captureSavedReminderCount}`,
    `Calendar-ready items: ${summary.calendarReadyItems}`,
    `Calendar exports: ${summary.calendarExports}`,
    `Copied event details: ${summary.copiedEventDetails}`,
    `Items needing date review: ${summary.itemsNeedingDateReview}`,
    `Items needing time review: ${summary.itemsNeedingTimeReview}`,
    `Alarm selections: ${summary.alarmSelections}`,
    `Upcoming viewed: ${summary.upcomingViewedCount}`,
    `Event detections: ${summary.eventDetections}`,
    `Reminder detections: ${summary.reminderDetections}`,
    `Used manual add after capture: ${summary.usedManualAddAfterCaptureCount}`,
    `Done clicks: ${summary.totalDoneClicks}`,
    `Later clicks: ${summary.totalLaterClicks}`,
    `Not today clicks: ${summary.totalNotTodayClicks}`,
    `Returned on Day 2: ${summary.returnedOnDay2 ? 'Yes' : 'No'}`,
    `Returned on Day 3: ${summary.returnedOnDay3 ? 'Yes' : 'No'}`,
    `Current saved tasks: ${summary.currentTaskCount}`,
    `Current saved events: ${summary.currentEventCount}`,
    `Current saved reminders: ${summary.currentReminderCount}`
  ];

  if (feedback.length > 0) {
    lines.push('', 'Founder notes:');
    feedback.forEach((item) => {
      const prefix = item.rating ? `[${item.rating}] ` : '';
      lines.push(`- ${prefix}${item.note}`);
    });
  }

  return lines.join('\n');
}

export function buildQAExport(data: QAData, summary: QASummary) {
  return {
    app: "What's Next",
    mode: 'founder-qa',
    exportedAt: new Date().toISOString(),
    includesPastedText: false,
    includesTaskTitles: false,
    summary,
    feedback: data.feedback,
    events: data.events
  };
}

export function clearQAData() {
  saveQAData(EMPTY_QA_DATA);
}

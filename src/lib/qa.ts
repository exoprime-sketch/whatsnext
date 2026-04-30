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

function countEvents(events: QAEvent[], eventName: QAEventName) {
  return events.filter((event) => event.eventName === eventName).length;
}

function sumCaptureSaves(events: QAEvent[]) {
  return events
    .filter((event) => event.eventName === 'capture_candidate_saved')
    .reduce((total, event) => total + (event.metadata?.captureCandidateCount ?? 1), 0);
}

export function buildQASummary(events: QAEvent[], tasks: Task[]): QASummary {
  const openEvents = events.filter((event) => event.eventName === 'app_open');
  const fallbackEvents = openEvents.length > 0 ? openEvents : events;
  const firstOpenAt = fallbackEvents.length > 0 ? fallbackEvents[fallbackEvents.length - 1].timestamp : null;
  const lastOpenAt = fallbackEvents.length > 0 ? fallbackEvents[0].timestamp : null;
  const openDateKeys = [...new Set(openEvents.map((event) => event.dateKey))];
  const firstOpenDateKey = openDateKeys[0] ?? null;

  return {
    firstOpenAt,
    lastOpenAt,
    activeDays: openDateKeys.length,
    totalAppOpens: openEvents.length,
    standaloneOpens: countEvents(events, 'standalone_open'),
    totalTasksCreated: countEvents(events, 'task_created'),
    totalDoneClicks: countEvents(events, 'now_card_done'),
    totalLaterClicks: countEvents(events, 'now_card_later'),
    totalNotTodayClicks: countEvents(events, 'now_card_not_today'),
    captureOpenedCount: countEvents(events, 'capture_opened'),
    captureSavedCount: sumCaptureSaves(events),
    returnedOnDay2: firstOpenDateKey ? openDateKeys.includes(addDays(firstOpenDateKey, 1)) : false,
    returnedOnDay3: firstOpenDateKey ? openDateKeys.includes(addDays(firstOpenDateKey, 2)) : false,
    currentActiveTaskCount: tasks.filter((task) => task.status === 'active').length,
    currentCompletedTaskCount: tasks.filter((task) => task.status === 'completed').length
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
    `Tasks added: ${summary.totalTasksCreated}`,
    `Done clicks: ${summary.totalDoneClicks}`,
    `Later clicks: ${summary.totalLaterClicks}`,
    `Not today clicks: ${summary.totalNotTodayClicks}`,
    `Capture opened: ${summary.captureOpenedCount}`,
    `Capture saves: ${summary.captureSavedCount}`,
    `Returned on Day 2: ${summary.returnedOnDay2 ? 'Yes' : 'No'}`,
    `Returned on Day 3: ${summary.returnedOnDay3 ? 'Yes' : 'No'}`,
    `Current active tasks: ${summary.currentActiveTaskCount}`,
    `Current completed tasks: ${summary.currentCompletedTaskCount}`
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
    summary,
    feedback: data.feedback,
    events: data.events
  };
}

export function clearQAData() {
  saveQAData(EMPTY_QA_DATA);
}

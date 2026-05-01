import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { CaptureCandidateCard } from './components/CaptureCandidateCard';
import { FounderQAPanel } from './components/FounderQAPanel';
import { NowCard } from './components/NowCard';
import { TaskCard } from './components/TaskCard';
import { TaskEditor } from './components/TaskEditor';
import { UpcomingPanel } from './components/UpcomingPanel';
import { sampleTasks } from './data/sampleTasks';
import { canExportICS, copyEventDetails, downloadICS } from './lib/calendarExport';
import { extractCaptureCandidates, refreshCaptureCandidate, SAMPLE_CAPTURE_TEXT } from './lib/capture';
import {
  buildQAExport,
  buildQASummary,
  buildQASummaryText,
  createQAEvent,
  createQAFeedback,
  getDisplayMode,
  initializeQAMode,
  loadQAData,
  removeQAQueryFlag,
  saveQAData,
  setQAModeEnabled
} from './lib/qa';
import { getNowRecommendation, scoreTask, sortTasksByRecommendation } from './lib/recommendation';
import { loadAppData, saveAppData } from './lib/storage';
import {
  applyDraftScheduling,
  applyFeedback,
  createLog,
  createTaskFromDraft,
  getPostponeWeight,
  incrementCalendarExport,
  incrementCopiedDetails,
  normalizeTasksForToday,
  updateAlarmPreference
} from './lib/tasks';
import { addDays, getGreetingCopy, plusMinutes, toDateKey } from './lib/time';
import type {
  ActivityLog,
  AppView,
  CaptureCandidate,
  ItemType,
  QAData,
  QAEventMetadata,
  QAEventName,
  QARating,
  Task,
  TaskDraft,
  TaskFilter
} from './types';

const COMPLETE_MESSAGES = ['Nice. One thing done.', 'That counts.', 'Good. Keep moving.'];

const FILTER_ITEMS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'completed', label: 'Done' },
  { value: 'postponed', label: 'Delayed' }
];

const ITEM_LABEL = {
  task: 'Tasks',
  event: 'Events',
  reminder: 'Reminders'
} as const;

interface CaptureOutcome {
  detectedCount: number;
  savedCount: number;
  savedTaskCount: number;
  savedEventCount: number;
  savedReminderCount: number;
  manualEntriesAvoidedApprox: number;
  calendarReadyCount: number;
  needsDateReviewCount: number;
  needsTimeReviewCount: number;
}

function getCompleteMessage(date: Date, nextTaskTitle?: string) {
  const base = COMPLETE_MESSAGES[date.getTime() % COMPLETE_MESSAGES.length];

  if (!nextTaskTitle) {
    return base;
  }

  return `${base} Up next: ${nextTaskTitle}.`;
}

function getVisibleTasks(filter: TaskFilter, tasks: Task[], now: Date) {
  const ranked = sortTasksByRecommendation(tasks, now);
  const todayKey = toDateKey(now);

  if (filter === 'completed') {
    return ranked
      .filter((task) => task.status === 'completed')
      .sort(
        (left, right) =>
          new Date(right.completedAt ?? right.createdAt).getTime() -
          new Date(left.completedAt ?? left.createdAt).getTime()
      );
  }

  if (filter === 'today') {
    const tomorrowKey = toDateKey(addDays(now, 1));
    return ranked.filter(
      (task) =>
        task.status === 'active' &&
        (!task.excludedToday || task.excludedOnDate !== todayKey) &&
        (!task.snoozeUntil || new Date(task.snoozeUntil).getTime() <= now.getTime()) &&
        (task.due === 'today' ||
          task.due === 'tomorrow' ||
          task.parsedDate === todayKey ||
          task.parsedDate === tomorrowKey ||
          task.needsDateReview ||
          task.needsTimeReview)
    );
  }

  if (filter === 'postponed') {
    return ranked.filter((task) => task.status === 'active' && getPostponeWeight(task) > 0);
  }

  return ranked;
}

function getDelaySummary(postponedTasks: Task[]) {
  if (postponedTasks.length === 0) {
    return {
      title: 'Nothing repeated',
      detail: "You don't have a follow-up getting pushed over and over."
    };
  }

  const topTask = postponedTasks[0];
  const count = getPostponeWeight(topTask);

  return {
    title: topTask.title,
    detail: `Delayed ${count} ${count === 1 ? 'time' : 'times'}.`
  };
}

function getItemCounts<T extends { itemType: ItemType }>(items: T[]) {
  return items.reduce(
    (counts, item) => {
      counts[item.itemType] += 1;
      return counts;
    },
    {
      task: 0,
      event: 0,
      reminder: 0
    } satisfies Record<ItemType, number>
  );
}

function getReviewCounts<T extends { needsDateReview?: boolean; needsTimeReview?: boolean }>(items: T[]) {
  return items.reduce(
    (counts, item) => {
      if (item.needsDateReview) {
        counts.needsDateReviewCount += 1;
      }

      if (item.needsTimeReview) {
        counts.needsTimeReviewCount += 1;
      }

      return counts;
    },
    {
      needsDateReviewCount: 0,
      needsTimeReviewCount: 0
    }
  );
}

function getCalendarReadyCount<T extends { calendarReady?: boolean }>(items: T[]) {
  return items.filter((item) => item.calendarReady).length;
}

function getCaptureOutcomeText(count: number) {
  return `About ${count} manual ${count === 1 ? 'entry' : 'entries'} avoided.`;
}

export default function App() {
  const [now, setNow] = useState(() => new Date());
  const [initialData] = useState(() => loadAppData(new Date()));
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [logs, setLogs] = useState<ActivityLog[]>(initialData.logs);
  const [activeView, setActiveView] = useState<AppView>('capture');
  const [listFilter, setListFilter] = useState<TaskFilter>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [manualEditorOpen, setManualEditorOpen] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureCandidates, setCaptureCandidates] = useState<CaptureCandidate[]>([]);
  const [captureOutcome, setCaptureOutcome] = useState<CaptureOutcome | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [qaMode, setQaMode] = useState(() => initializeQAMode());
  const [qaData, setQaData] = useState<QAData>(() => loadQAData());
  const qaOpenTrackedRef = useRef(false);
  const lastNowTaskIdRef = useRef<string | null>(null);
  const captureFlowRef = useRef({
    hasExtraction: false,
    manualAfterCaptureTracked: false
  });

  const greeting = getGreetingCopy(now);
  const recommendation = getNowRecommendation(tasks, now);
  const sortedTasks = sortTasksByRecommendation(tasks, now);
  const visibleTasks = getVisibleTasks(listFilter, tasks, now);
  const activeTasks = tasks.filter((task) => task.status === 'active');
  const postponedTasks = tasks
    .filter((task) => task.status === 'active' && getPostponeWeight(task) > 0)
    .sort((left, right) => getPostponeWeight(right) - getPostponeWeight(left));
  const nextCandidates = sortedTasks
    .filter(
      (task) =>
        task.status === 'active' &&
        task.id !== recommendation.task?.id &&
        Number.isFinite(scoreTask(task, now).score)
    )
    .slice(0, 3);
  const delaySummary = getDelaySummary(postponedTasks);
  const qaSummary = buildQASummary(qaData.events, tasks);
  const captureCandidateCounts = getItemCounts(captureCandidates);
  const captureReviewCounts = getReviewCounts(captureCandidates);
  const savedItemCounts = getItemCounts(tasks);
  const reviewCounts = getReviewCounts(tasks);
  const calendarReadySavedCount = getCalendarReadyCount(tasks);
  const calendarNotExportedCount = tasks.filter((task) => task.calendarReady && !task.calendarExportedAt).length;
  const todayKey = toDateKey(now);
  const tomorrowKey = toDateKey(addDays(now, 1));
  const todayFollowUpsCount = activeTasks.filter(
    (task) =>
      task.due === 'today' ||
      task.parsedDate === todayKey ||
      task.parsedDate === tomorrowKey ||
      task.due === 'tomorrow'
  ).length;
  const capturedCount = tasks.filter((task) => task.source === 'capture').length;
  const recentCaptureCount = tasks.filter((task) => task.source === 'capture').slice(0, 5).length;
  const hasSavedItems = activeTasks.length > 0;
  const selectedCaptureCandidates = captureCandidates.filter((candidate) => candidate.selected && candidate.title.trim());
  const selectedCaptureCounts = getItemCounts(selectedCaptureCandidates);
  const selectedCaptureCalendarReadyCount = getCalendarReadyCount(selectedCaptureCandidates);
  const selectedCaptureReviewCounts = getReviewCounts(selectedCaptureCandidates);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function clearCaptureComposer() {
    setCaptureText('');
    setCaptureCandidates([]);
    setCaptureOutcome(null);
  }

  function pushLog(type: ActivityLog['type'], when: Date, taskId?: string, meta?: string) {
    setLogs((current) => [createLog(type, when, taskId, meta), ...current].slice(0, 300));
  }

  function buildQAMetadata(taskSnapshot: Task[], overrides: QAEventMetadata = {}) {
    const activeTaskCount = taskSnapshot.filter((task) => task.status === 'active').length;

    return {
      taskCount: taskSnapshot.length,
      activeTaskCount,
      completedTaskCount: taskSnapshot.length - activeTaskCount,
      displayMode: getDisplayMode(),
      ...overrides
    };
  }

  function trackQAEvent(
    eventName: QAEventName,
    overrides: QAEventMetadata = {},
    timestamp = new Date(),
    taskSnapshot = tasks
  ) {
    if (!qaMode) {
      return;
    }

    setQaData((current) => ({
      ...current,
      events: [createQAEvent(eventName, timestamp, buildQAMetadata(taskSnapshot, overrides)), ...current.events].slice(
        0,
        800
      )
    }));
  }

  function trackReviewCompletion(
    previous: Pick<TaskDraft, 'needsDateReview' | 'needsTimeReview'>,
    next: Pick<TaskDraft, 'needsDateReview' | 'needsTimeReview'>,
    stamp: Date,
    taskSnapshot = tasks
  ) {
    if (previous.needsDateReview && !next.needsDateReview) {
      trackQAEvent('date_review_completed', {}, stamp, taskSnapshot);
    }

    if (previous.needsTimeReview && !next.needsTimeReview) {
      trackQAEvent('time_review_completed', {}, stamp, taskSnapshot);
    }
  }

  function trackManualAfterCapture(taskSnapshot: Task[], timestamp: Date) {
    if (!qaMode || !captureFlowRef.current.hasExtraction || captureFlowRef.current.manualAfterCaptureTracked) {
      return;
    }

    captureFlowRef.current.manualAfterCaptureTracked = true;
    trackQAEvent('used_manual_add_after_capture', {}, timestamp, taskSnapshot);
  }

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to legacy copy.
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'absolute';
    helper.style.left = '-9999px';
    document.body.appendChild(helper);
    helper.select();
    const success = document.execCommand('copy');
    document.body.removeChild(helper);
    return success;
  }

  async function copyQASummary() {
    const summaryText = buildQASummaryText(qaSummary, qaData.feedback);
    const success = await copyText(summaryText);
    showToast(success ? 'QA summary copied.' : 'Copy failed. Try Download QA JSON.');
  }

  function downloadQAJson() {
    const payload = buildQAExport(qaData, qaSummary);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsnext-founder-qa-${toDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('QA JSON downloaded.');
  }

  function clearQALog() {
    if (!window.confirm('Clear the local QA event log and notes?')) {
      return;
    }

    setQaData({
      events: [],
      feedback: []
    });
    showToast('QA log cleared.');
  }

  function disableQAMode() {
    setQAModeEnabled(false);
    removeQAQueryFlag();
    setQaMode(false);
    showToast('QA mode disabled.');
  }

  function saveQANote(note: string, rating: QARating | '') {
    const stamp = new Date();
    const feedback = createQAFeedback(note, rating, stamp);

    setQaData((current) => ({
      ...current,
      feedback: [feedback, ...current.feedback].slice(0, 100)
    }));
    showToast('QA note saved.');
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTasks((current) => normalizeTasksForToday(current, now));
  }, [now]);

  useEffect(() => {
    saveAppData({
      version: '0.1',
      tasks,
      logs
    });
  }, [tasks, logs]);

  useEffect(() => {
    saveQAData(qaData);
  }, [qaData]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!qaMode || qaOpenTrackedRef.current) {
      return;
    }

    qaOpenTrackedRef.current = true;

    const stamp = new Date();
    const displayMode = getDisplayMode();
    const metadata = buildQAMetadata(tasks, { displayMode });
    const openEvents = [createQAEvent('app_open', stamp, metadata)];

    if (displayMode === 'standalone') {
      openEvents.unshift(createQAEvent('standalone_open', stamp, metadata));
    }

    setQaData((current) => ({
      ...current,
      events: [...openEvents, ...current.events].slice(0, 800)
    }));
  }, [qaMode, tasks]);

  useEffect(() => {
    if (!qaMode) {
      return;
    }

    if (activeView === 'capture') {
      trackQAEvent('capture_opened');
    }

    if (activeView === 'settings') {
      trackQAEvent('settings_opened');
    }
  }, [activeView, qaMode]);

  useEffect(() => {
    if (!qaMode || activeView !== 'now') {
      return;
    }

    const currentTaskId = recommendation.task?.id ?? null;

    if (!currentTaskId) {
      lastNowTaskIdRef.current = null;
      return;
    }

    if (lastNowTaskIdRef.current === currentTaskId) {
      return;
    }

    if (lastNowTaskIdRef.current) {
      trackQAEvent('now_card_changed', {
        previousNowTaskId: lastNowTaskIdRef.current,
        nowTaskId: currentTaskId
      });
    }

    trackQAEvent('now_card_viewed', {
      nowTaskId: currentTaskId
    });
    lastNowTaskIdRef.current = currentTaskId;
  }, [activeView, qaMode, recommendation.task?.id]);

  function addTask(draft: TaskDraft, source: Task['source'] = 'manual') {
    const stamp = new Date();
    const task = createTaskFromDraft(draft, stamp, source);
    const nextTasks = [task, ...tasks];

    setTasks((current) => [task, ...current]);
    pushLog(source === 'capture' ? 'captured' : 'created', stamp, task.id);

    if (source === 'manual') {
      trackManualAfterCapture(nextTasks, stamp);
      trackQAEvent(
        'manual_task_created',
        {
          source,
          itemType: task.itemType
        },
        stamp,
        nextTasks
      );
      setManualEditorOpen(false);
    }

    if (task.alarmEnabled) {
      trackQAEvent(
        'alarm_option_selected',
        {
          itemType: task.itemType,
          alarmBeforeMinutes: task.alarmBeforeMinutes,
          alarmSelectionCount: 1
        },
        stamp,
        nextTasks
      );
    }

    if (task.needsDateReview || task.needsTimeReview) {
      trackQAEvent(
        'item_marked_needs_review',
        {
          itemsNeedingDateReviewCount: task.needsDateReview ? 1 : 0,
          itemsNeedingTimeReviewCount: task.needsTimeReview ? 1 : 0
        },
        stamp,
        nextTasks
      );
    }

    if (task.calendarReady) {
      trackQAEvent('calendar_export_available', { calendarReadyCount: 1 }, stamp, nextTasks);
    }

    showToast(source === 'capture' ? "Saved. You don't have to retype it later." : 'Saved.');
    setActiveView(source === 'manual' ? 'tasks' : 'upcoming');
  }

  function updateTask(taskId: string, draft: TaskDraft) {
    const stamp = new Date();
    const previousTask = tasks.find((task) => task.id === taskId);

    if (!previousTask) {
      return;
    }

    const nextDraft = applyDraftScheduling(draft, stamp);
    const nextTask = {
      ...previousTask,
      ...nextDraft,
      title: nextDraft.title.trim(),
      memo: nextDraft.memo.trim()
    };

    const nextTasks = tasks.map((task) => (task.id === taskId ? nextTask : task));

    setTasks(nextTasks);
    pushLog('edited', stamp, taskId);
    trackReviewCompletion(previousTask, nextTask, stamp, nextTasks);

    if (
      previousTask.alarmEnabled !== nextTask.alarmEnabled ||
      previousTask.alarmBeforeMinutes !== nextTask.alarmBeforeMinutes
    ) {
      trackQAEvent(
        'alarm_option_selected',
        {
          itemType: nextTask.itemType,
          alarmBeforeMinutes: nextTask.alarmBeforeMinutes,
          alarmSelectionCount: 1
        },
        stamp,
        nextTasks
      );
    }

    if (nextTask.calendarReady && !previousTask.calendarReady) {
      trackQAEvent('calendar_export_available', { calendarReadyCount: 1 }, stamp, nextTasks);
    }

    setEditingTask(null);
    showToast('Changes saved.');
  }

  function completeTask(taskId: string) {
    const stamp = new Date();
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'completed' as const,
            completedAt: stamp.toISOString(),
            excludedToday: false,
            excludedOnDate: undefined,
            snoozeUntil: undefined
          }
        : task
    );

    const nextTask = getNowRecommendation(updatedTasks, stamp).task;

    setTasks(updatedTasks);
    pushLog('completed', stamp, taskId);
    trackQAEvent('item_marked_done', {}, stamp, updatedTasks);
    showToast(getCompleteMessage(stamp, nextTask?.title));
  }

  function deleteTask(taskId: string) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !window.confirm(`Delete "${target.title}"?`)) {
      return;
    }

    const stamp = new Date();
    setTasks((current) => current.filter((task) => task.id !== taskId));
    pushLog('deleted', stamp, taskId);
    showToast('Item deleted.');
  }

  function snoozeTask(taskId: string) {
    const stamp = new Date();
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? applyFeedback(task, stamp, 'snooze', {
            snoozeCount: task.snoozeCount + 1,
            snoozeUntil: plusMinutes(stamp, 10).toISOString(),
            excludedToday: false,
            excludedOnDate: undefined
          })
        : task
    );

    setTasks(updatedTasks);
    pushLog('snoozed', stamp, taskId);
    trackQAEvent('now_card_later', { nowTaskId: taskId }, stamp, updatedTasks);
    showToast('Parked for now.');
  }

  function skipToday(taskId: string) {
    const stamp = new Date();
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? applyFeedback(task, stamp, 'skipToday', {
            excludedToday: true,
            excludedOnDate: toDateKey(stamp),
            snoozeUntil: undefined
          })
        : task
    );

    setTasks(updatedTasks);
    pushLog('excludedToday', stamp, taskId);
    trackQAEvent('now_card_not_today', { nowTaskId: taskId }, stamp, updatedTasks);
    showToast('Hidden for today.');
  }

  function restoreSamples() {
    if (!window.confirm('Replace your current data with sample items?')) {
      return;
    }

    const stamp = new Date();
    const restoredTasks = sampleTasks(stamp);
    setTasks(restoredTasks);
    setLogs([createLog('restoredSamples', stamp)]);
    clearCaptureComposer();
    captureFlowRef.current = {
      hasExtraction: false,
      manualAfterCaptureTracked: false
    };
    trackQAEvent('sample_tasks_restored', {}, stamp, restoredTasks);
    setActiveView('capture');
    showToast('Sample items restored.');
  }

  function clearAll() {
    if (!window.confirm('Reset all local data? This cannot be undone.')) {
      return;
    }

    const stamp = new Date();
    setTasks([]);
    setLogs([]);
    clearCaptureComposer();
    captureFlowRef.current = {
      hasExtraction: false,
      manualAfterCaptureTracked: false
    };
    trackQAEvent('data_reset', {}, stamp, []);
    setActiveView('capture');
    showToast('All local data cleared.');
  }

  function runExtraction(input: string) {
    if (!input.trim()) {
      showToast('Paste a message or meeting note first.');
      return;
    }

    const stamp = new Date();
    const candidates = extractCaptureCandidates(input, stamp);
    const counts = getItemCounts(candidates);
    const reviewCountsForCandidates = getReviewCounts(candidates);
    const calendarReadyCount = getCalendarReadyCount(candidates);

    setCaptureCandidates(candidates);
    setCaptureOutcome(null);
    captureFlowRef.current = {
      hasExtraction: true,
      manualAfterCaptureTracked: false
    };

    trackQAEvent('extraction_run', {
      detectedItemsCount: candidates.length,
      extractedTaskCount: counts.task,
      extractedEventCount: counts.event,
      extractedReminderCount: counts.reminder
    });

    if (calendarReadyCount > 0) {
      trackQAEvent('calendar_export_available', { calendarReadyCount }, stamp);
    }

    if (reviewCountsForCandidates.needsDateReviewCount || reviewCountsForCandidates.needsTimeReviewCount) {
      trackQAEvent(
        'item_marked_needs_review',
        {
          itemsNeedingDateReviewCount: reviewCountsForCandidates.needsDateReviewCount,
          itemsNeedingTimeReviewCount: reviewCountsForCandidates.needsTimeReviewCount
        },
        stamp
      );
    }

    if (candidates.length === 0) {
      showToast('No clear items yet. Try shorter lines or one note at a time.');
      return;
    }

    showToast(`Detected ${candidates.length} ${candidates.length === 1 ? 'item' : 'items'}.`);
  }

  function parseCaptureText() {
    runExtraction(captureText);
  }

  function trySampleCapture() {
    setCaptureText(SAMPLE_CAPTURE_TEXT);
    runExtraction(SAMPLE_CAPTURE_TEXT);
  }

  function saveCaptureCandidates() {
    const selected = captureCandidates
      .filter((candidate) => candidate.selected && candidate.title.trim())
      .map((candidate) =>
        applyDraftScheduling(
          {
            ...candidate,
            title: candidate.title.trim(),
            memo: candidate.memo.trim()
          },
          new Date()
        )
      );

    if (selected.length === 0) {
      showToast('Select at least one item to save.');
      return;
    }

    const stamp = new Date();
    const createdTasks = selected.map((candidate) => createTaskFromDraft(candidate, stamp, 'capture'));
    const nextTasks = [...createdTasks, ...tasks];
    const counts = getItemCounts(selected);
    const nextReviewCounts = getReviewCounts(selected);
    const calendarReadyCount = getCalendarReadyCount(selected);
    const outcome: CaptureOutcome = {
      detectedCount: captureCandidates.length,
      savedCount: selected.length,
      savedTaskCount: counts.task,
      savedEventCount: counts.event,
      savedReminderCount: counts.reminder,
      manualEntriesAvoidedApprox: selected.length,
      calendarReadyCount,
      needsDateReviewCount: nextReviewCounts.needsDateReviewCount,
      needsTimeReviewCount: nextReviewCounts.needsTimeReviewCount
    };

    setTasks((current) => [...createdTasks, ...current]);
    setLogs((current) => [...createdTasks.map((task) => createLog('captured', stamp, task.id)), ...current].slice(0, 300));
    setCaptureText('');
    setCaptureCandidates([]);
    setCaptureOutcome(outcome);
    captureFlowRef.current = {
      hasExtraction: true,
      manualAfterCaptureTracked: false
    };

    trackQAEvent(
      'capture_items_saved',
      {
        savedDetectedItemsCount: selected.length,
        savedTaskCount: counts.task,
        savedEventCount: counts.event,
        savedReminderCount: counts.reminder,
        manualEntriesAvoidedApprox: outcome.manualEntriesAvoidedApprox
      },
      stamp,
      nextTasks
    );

    if (calendarReadyCount > 0) {
      trackQAEvent('calendar_export_available', { calendarReadyCount }, stamp, nextTasks);
    }

    if (nextReviewCounts.needsDateReviewCount || nextReviewCounts.needsTimeReviewCount) {
      trackQAEvent(
        'item_marked_needs_review',
        {
          itemsNeedingDateReviewCount: nextReviewCounts.needsDateReviewCount,
          itemsNeedingTimeReviewCount: nextReviewCounts.needsTimeReviewCount
        },
        stamp,
        nextTasks
      );
    }

    const alarmSelections = selected.filter((item) => item.alarmEnabled).length;
    if (alarmSelections > 0) {
      trackQAEvent('alarm_option_selected', { alarmSelectionCount: alarmSelections }, stamp, nextTasks);
    }

    showToast("Saved. You don't have to retype it later.");
  }

  function updateCaptureCandidate(candidateId: string, updates: Partial<CaptureCandidate>) {
    const previousCandidate = captureCandidates.find((candidate) => candidate.id === candidateId);

    if (!previousCandidate) {
      return;
    }

    const nextCandidate = refreshCaptureCandidate(
      {
        ...previousCandidate,
        ...updates
      },
      new Date()
    );

    setCaptureCandidates((current) => current.map((candidate) => (candidate.id === candidateId ? nextCandidate : candidate)));
    trackReviewCompletion(previousCandidate, nextCandidate, new Date());
  }

  function updateCaptureCandidateAlarm(candidateId: string, alarmEnabled: boolean, alarmBeforeMinutes: number | null) {
    const previousCandidate = captureCandidates.find((candidate) => candidate.id === candidateId);

    if (!previousCandidate) {
      return;
    }

    const nextCandidate = updateAlarmPreference(previousCandidate, alarmEnabled, alarmBeforeMinutes);
    setCaptureCandidates((current) => current.map((candidate) => (candidate.id === candidateId ? nextCandidate : candidate)));
    trackQAEvent('alarm_option_selected', {
      itemType: nextCandidate.itemType,
      alarmBeforeMinutes,
      alarmSelectionCount: 1
    });
  }

  async function previewCopyDetails(candidate: CaptureCandidate) {
    const success = await copyEventDetails(candidate);
    if (success) {
      trackQAEvent('event_details_copied', { eventDetailsCopiedCount: 1 });
    }
    showToast(success ? 'Details copied.' : 'Copy failed.');
  }

  function previewDownloadICS(candidate: CaptureCandidate) {
    if (!canExportICS(candidate)) {
      showToast('This item needs a clear date and time before calendar export.');
      return;
    }

    try {
      downloadICS(candidate);
      trackQAEvent('calendar_file_downloaded', { calendarExportCount: 1 });
      showToast('Calendar file downloaded.');
    } catch {
      showToast('Calendar export failed.');
    }
  }

  async function handleCopyDetails(task: Task) {
    const success = await copyEventDetails(task);
    if (success) {
      setTasks((current) => current.map((item) => (item.id === task.id ? incrementCopiedDetails(item) : item)));
      trackQAEvent('event_details_copied', { eventDetailsCopiedCount: 1 });
    }
    showToast(success ? 'Details copied.' : 'Copy failed.');
  }

  function handleDownloadICS(task: Task) {
    if (!canExportICS(task)) {
      showToast('This item needs a clear date and time before calendar export.');
      return;
    }

    try {
      downloadICS(task);
      const stamp = new Date();
      setTasks((current) => current.map((item) => (item.id === task.id ? incrementCalendarExport(item, stamp) : item)));
      trackQAEvent('calendar_file_downloaded', { calendarExportCount: 1 }, stamp);
      showToast('Calendar file downloaded.');
    } catch {
      showToast('Calendar export failed.');
    }
  }

  function renderNowView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Now</div>
            <h1>One thing to follow up on.</h1>
            <p>{greeting.status}</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('capture')}>
            Capture more
          </button>
        </header>

        <NowCard
          task={recommendation.task}
          reasons={recommendation.reasons}
          onComplete={completeTask}
          onSnooze={snoozeTask}
          onSkipToday={skipToday}
          onOpenCapture={() => setActiveView('capture')}
          onManualAdd={() => setManualEditorOpen(true)}
        />

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Saved from capture</div>
            <strong>{capturedCount}</strong>
            <p>Follow-ups saved from pasted notes.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Coming up</div>
            <strong>{todayFollowUpsCount}</strong>
            <p>Things worth checking soon.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Needs review</div>
            <strong>{reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount}</strong>
            <p>Review before you forget.</p>
          </article>
        </section>

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>Keep moving</h2>
              <p>The next few follow-ups.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveView('upcoming')}>
              View upcoming
            </button>
          </div>
          <div className="stack">
            {nextCandidates.length > 0 ? (
              nextCandidates.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={setEditingTask}
                  onDelete={deleteTask}
                  onDownloadICS={handleDownloadICS}
                  onCopyDetails={handleCopyDetails}
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>Nothing else needs to compete right now.</h3>
                <p>Capture another message or confirm one upcoming detail.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderUpcomingView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Upcoming</div>
            <h1>What might you miss?</h1>
            <p>Today, tomorrow, and anything that still needs a date or time.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('capture')}>
            Capture more
          </button>
        </header>

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Today's follow-ups</div>
            <strong>{todayFollowUpsCount}</strong>
            <p>Worth checking first.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Needs review</div>
            <strong>{reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount}</strong>
            <p>Review before you forget.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Calendar-ready</div>
            <strong>{calendarNotExportedCount}</strong>
            <p>Ready to add to your calendar.</p>
          </article>
        </section>

        <UpcomingPanel
          tasks={tasks}
          now={now}
          onEdit={setEditingTask}
          onComplete={completeTask}
          onDelete={deleteTask}
          onDownloadICS={handleDownloadICS}
          onCopyDetails={handleCopyDetails}
          onViewed={() => trackQAEvent('upcoming_viewed')}
        />
      </section>
    );
  }

  function renderTasksView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Tasks</div>
            <h1>Saved items</h1>
            <p>Everything you saved from capture or quick add.</p>
          </div>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={() => setManualEditorOpen(true)}>
              Add manually
            </button>
            <button type="button" className="ghost-button" onClick={() => setActiveView('capture')}>
              Capture more
            </button>
          </div>
        </header>

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Tasks</div>
            <strong>{savedItemCounts.task}</strong>
            <p>Action items saved in the app.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Events</div>
            <strong>{savedItemCounts.event}</strong>
            <p>Calendar-ready items saved locally for now.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Reminders</div>
            <strong>{savedItemCounts.reminder}</strong>
            <p>Follow-ups that should not disappear.</p>
          </article>
        </section>

        <div className="filter-bar">
          {FILTER_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chip ${listFilter === item.value ? 'is-selected' : ''}`}
              onClick={() => setListFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="stack">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showStatus
                onComplete={task.status === 'active' ? completeTask : undefined}
                onEdit={task.status === 'active' ? setEditingTask : undefined}
                onDelete={deleteTask}
                onDownloadICS={handleDownloadICS}
                onCopyDetails={handleCopyDetails}
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>No saved tasks yet.</h3>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCaptureGroup(type: ItemType) {
    const items = captureCandidates.filter(
      (candidate) => candidate.itemType === type && !candidate.needsDateReview && !candidate.needsTimeReview
    );

    if (items.length === 0) {
      return null;
    }

    return (
      <section key={type} className="capture-group">
        <div className="section-heading">
          <div>
            <h2>{ITEM_LABEL[type]}</h2>
            <p>{items.length} detected</p>
          </div>
        </div>
        <div className="stack">
          {items.map((candidate) => (
            <CaptureCandidateCard
              key={candidate.id}
              candidate={candidate}
              onToggleSelected={(candidateId, selected) => updateCaptureCandidate(candidateId, { selected })}
              onChange={updateCaptureCandidate}
              onAlarmChange={updateCaptureCandidateAlarm}
              onPreviewDownload={previewDownloadICS}
              onPreviewCopy={previewCopyDetails}
            />
          ))}
        </div>
      </section>
    );
  }

  function renderNeedsReviewGroup() {
    const items = captureCandidates.filter((candidate) => candidate.needsDateReview || candidate.needsTimeReview);

    if (items.length === 0) {
      return null;
    }

    return (
      <section className="capture-group">
        <div className="section-heading">
          <div>
            <h2>Needs review</h2>
            <p>Review before you forget</p>
          </div>
        </div>
        <div className="stack">
          {items.map((candidate) => (
            <CaptureCandidateCard
              key={candidate.id}
              candidate={candidate}
              onToggleSelected={(candidateId, selected) => updateCaptureCandidate(candidateId, { selected })}
              onChange={updateCaptureCandidate}
              onAlarmChange={updateCaptureCandidateAlarm}
              onPreviewDownload={previewDownloadICS}
              onPreviewCopy={previewCopyDetails}
            />
          ))}
        </div>
      </section>
    );
  }

  function renderCaptureView() {
    return (
      <section className="view">
        <header className="hero-card hero-card--capture hero-card--compact">
          <div className="eyebrow">What's Next</div>
          <h1>Stop retyping tasks and plans.</h1>
          <p>Paste a message or meeting note. We&apos;ll find the follow-ups.</p>
        </header>

        <section className="panel panel--capture">
          <label className="field field--spacious">
            <span>Paste a message, meeting note, or plan</span>
            <textarea
              rows={7}
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Example: Dinner with Mina on Saturday at 7 PM near Gangnam Station. Don't forget to book a table before Friday. Please send the revised report by Friday and call Alex at 3 PM tomorrow."
            />
          </label>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={parseCaptureText}>
              Extract
            </button>
            <button type="button" className="ghost-button" onClick={trySampleCapture}>
              Try sample
            </button>
            <button type="button" className="ghost-button" onClick={clearCaptureComposer}>
              Clear
            </button>
          </div>
          <p className="subcopy">Only what you paste. No account.</p>
        </section>

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>What might you miss?</h2>
            </div>
            {hasSavedItems ? (
              <button type="button" className="ghost-button" onClick={() => setActiveView('upcoming')}>
                View upcoming
              </button>
            ) : null}
          </div>
          {hasSavedItems ? (
            <div className="meta-row meta-row--summary">
              <span>Today {todayFollowUpsCount}</span>
              <span>Needs review {reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount}</span>
              <span>Calendar-ready {calendarNotExportedCount}</span>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No follow-ups yet.</h3>
              <p>Paste something messy. We&apos;ll clean it up.</p>
            </div>
          )}
        </section>

        {captureOutcome ? (
          <section className="panel panel--success">
            <div className="section-heading">
              <div>
                <h2>Typing saved</h2>
                <p>Saved. You don&apos;t have to retype it later.</p>
              </div>
              <div className="action-row">
                <button type="button" className="secondary-button" onClick={() => setActiveView('upcoming')}>
                  View upcoming
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveView('now')}>
                  View what&apos;s next
                </button>
                <button type="button" className="ghost-button" onClick={clearCaptureComposer}>
                  Capture another note
                </button>
              </div>
            </div>
            <div className="summary-grid summary-grid--three">
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Calendar-ready</div>
                <strong>{captureOutcome.calendarReadyCount}</strong>
                <p>Ready for calendar file export.</p>
              </article>
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Needs review</div>
                <strong>{captureOutcome.needsDateReviewCount + captureOutcome.needsTimeReviewCount}</strong>
                <p>
                  {captureOutcome.needsDateReviewCount} need date review, {captureOutcome.needsTimeReviewCount} need time review
                </p>
              </article>
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Saved</div>
                <strong>{captureOutcome.savedCount}</strong>
                <p>
                  {captureOutcome.savedTaskCount} tasks, {captureOutcome.savedEventCount} events, {captureOutcome.savedReminderCount} reminders
                </p>
              </article>
            </div>
          </section>
        ) : null}

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>{captureCandidates.length > 0 ? `${captureCandidates.length} item${captureCandidates.length === 1 ? '' : 's'} found` : 'Detected items'}</h2>
              <p>
                {captureCandidates.length > 0
                  ? `${getCalendarReadyCount(captureCandidates)} calendar-ready. ${captureReviewCounts.needsDateReviewCount + captureReviewCounts.needsTimeReviewCount} need review.`
                  : 'Paste something messy. We’ll clean it up.'}
              </p>
            </div>
          </div>

          {captureCandidates.length > 0 ? (
            <>
              <div className="capture-save-bar">
                <div>
                  <strong>{selectedCaptureCandidates.length} selected</strong>
                  <p>
                    {selectedCaptureCounts.task} tasks, {selectedCaptureCounts.event} events, {selectedCaptureCounts.reminder} reminders
                  </p>
                  <p>
                    {selectedCaptureCalendarReadyCount} calendar-ready. {selectedCaptureReviewCounts.needsDateReviewCount + selectedCaptureReviewCounts.needsTimeReviewCount} need review.
                  </p>
                </div>
                <button type="button" className="primary-button" onClick={saveCaptureCandidates}>
                  Save selected
                </button>
              </div>
              <div className="stack">
                {renderCaptureGroup('task')}
                {renderCaptureGroup('event')}
                {renderCaptureGroup('reminder')}
                {renderNeedsReviewGroup()}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No extraction yet.</h3>
              <p>Paste something messy. We&apos;ll clean it up.</p>
            </div>
          )}
        </section>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Settings</div>
            <h1>Settings</h1>
            <p>Local settings for your saved items.</p>
          </div>
        </header>

        <section className="panel panel--quiet">
          <h2>Privacy</h2>
          <p>Only what you paste. No account. No server.</p>
        </section>

        {qaMode ? (
          <FounderQAPanel
            summary={qaSummary}
            feedback={qaData.feedback}
            onCopySummary={copyQASummary}
            onDownloadJson={downloadQAJson}
            onClearLog={clearQALog}
            onDisable={disableQAMode}
            onSubmitFeedback={saveQANote}
          />
        ) : null}

        <section className="panel panel--quiet">
          <h2>Data</h2>
          <div className="stack">
            <button type="button" className="secondary-button" onClick={() => setManualEditorOpen(true)}>
              Add manually
            </button>
            <button type="button" className="secondary-button" onClick={restoreSamples}>
              Restore sample items
            </button>
            <button type="button" className="ghost-button danger-text" onClick={clearAll}>
              Reset data
            </button>
          </div>
        </section>

        <section className="panel panel--quiet">
          <h2>Version</h2>
          <p>Version 0.1</p>
        </section>
      </section>
    );
  }

  function renderView() {
    switch (activeView) {
      case 'upcoming':
        return renderUpcomingView();
      case 'now':
        return renderNowView();
      case 'tasks':
        return renderTasksView();
      case 'capture':
        return renderCaptureView();
      case 'settings':
        return renderSettingsView();
    }
  }

  return (
    <div className="app-shell">
      <div className="device-frame">
        <div className="app-surface">
          <main className="content">{renderView()}</main>
          <BottomNav activeView={activeView} onChange={setActiveView} />
        </div>
      </div>

      {manualEditorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setManualEditorOpen(false)}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <TaskEditor
              title="Add manually"
              description="Use this when there is nothing useful to capture."
              submitLabel="Save manual item"
              onSubmit={(draft) => addTask(draft)}
              onCancel={() => setManualEditorOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditingTask(null)}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <TaskEditor
              initialValue={editingTask}
              title="Edit item"
              description="Use this to confirm times, choose alarms, or make the export details clearer."
              submitLabel="Save changes"
              onSubmit={(draft) => updateTask(editingTask.id, draft)}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      ) : null}

      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </div>
  );
}

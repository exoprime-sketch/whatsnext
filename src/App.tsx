import { useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { CaptureCandidateCard } from './components/CaptureCandidateCard';
import { FounderQAPanel } from './components/FounderQAPanel';
import { NowCard } from './components/NowCard';
import { TaskCard } from './components/TaskCard';
import { TaskEditor } from './components/TaskEditor';
import { UpcomingPanel } from './components/UpcomingPanel';
import { sampleTasks } from './data/sampleTasks';
import { brand } from './lib/brand';
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
import { addDays, plusMinutes, toDateKey } from './lib/time';
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

type ImportMode = 'file' | 'screenshot' | 'recording' | 'text';

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

const CAL_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
  if (!nextTaskTitle) return base;
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

function getItemCounts<T extends { itemType: ItemType }>(items: T[]) {
  return items.reduce(
    (counts, item) => {
      counts[item.itemType] += 1;
      return counts;
    },
    { task: 0, event: 0, reminder: 0 } satisfies Record<ItemType, number>
  );
}

function getReviewCounts<T extends { needsDateReview?: boolean; needsTimeReview?: boolean }>(items: T[]) {
  return items.reduce(
    (counts, item) => {
      if (item.needsDateReview) counts.needsDateReviewCount += 1;
      if (item.needsTimeReview) counts.needsTimeReviewCount += 1;
      return counts;
    },
    { needsDateReviewCount: 0, needsTimeReviewCount: 0 }
  );
}

function getCalendarReadyCount<T extends { calendarReady?: boolean }>(items: T[]) {
  return items.filter((item) => item.calendarReady).length;
}

function getCaptureOutcomeText(count: number) {
  return `About ${count} manual ${count === 1 ? 'entry' : 'entries'} avoided.`;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file, 'utf-8');
  });
}

export default function App() {
  const [now, setNow] = useState(() => new Date());
  const [initialData] = useState(() => loadAppData(new Date()));
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [logs, setLogs] = useState<ActivityLog[]>(initialData.logs);
  const [activeView, setActiveView] = useState<AppView>('import');
  const [listFilter, setListFilter] = useState<TaskFilter>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [manualEditorOpen, setManualEditorOpen] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureCandidates, setCaptureCandidates] = useState<CaptureCandidate[]>([]);
  const [captureOutcome, setCaptureOutcome] = useState<CaptureOutcome | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [qaMode, setQaMode] = useState(() => initializeQAMode());
  const [qaData, setQaData] = useState<QAData>(() => loadQAData());
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importFileText, setImportFileText] = useState('');
  const [importImageSrc, setImportImageSrc] = useState('');
  const [importProcessing, setImportProcessing] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const qaOpenTrackedRef = useRef(false);
  const lastNowTaskIdRef = useRef<string | null>(null);
  const captureFlowRef = useRef({ hasExtraction: false, manualAfterCaptureTracked: false });

  const recommendation = getNowRecommendation(tasks, now);
  const sortedTasks = sortTasksByRecommendation(tasks, now);
  const visibleTasks = getVisibleTasks(listFilter, tasks, now);
  const activeTasks = tasks.filter((task) => task.status === 'active');
  const nextCandidates = sortedTasks
    .filter(
      (task) =>
        task.status === 'active' &&
        task.id !== recommendation.task?.id &&
        Number.isFinite(scoreTask(task, now).score)
    )
    .slice(0, 3);
  const qaSummary = buildQASummary(qaData.events, tasks);
  const captureReviewCounts = getReviewCounts(captureCandidates);
  const reviewCounts = getReviewCounts(tasks);
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
  const hasSavedItems = activeTasks.length > 0;
  const selectedCaptureCandidates = captureCandidates.filter((c) => c.selected && c.title.trim());
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

  function clearImportState() {
    if (importImageSrc) URL.revokeObjectURL(importImageSrc);
    setImportFileName('');
    setImportFileText('');
    setImportImageSrc('');
    setImportProcessing(false);
    setImportMode(null);
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
    if (!qaMode) return;
    setQaData((current) => ({
      ...current,
      events: [
        createQAEvent(eventName, timestamp, buildQAMetadata(taskSnapshot, overrides)),
        ...current.events
      ].slice(0, 800)
    }));
  }

  function trackReviewCompletion(
    previous: Pick<TaskDraft, 'needsDateReview' | 'needsTimeReview'>,
    next: Pick<TaskDraft, 'needsDateReview' | 'needsTimeReview'>,
    stamp: Date,
    taskSnapshot = tasks
  ) {
    if (previous.needsDateReview && !next.needsDateReview)
      trackQAEvent('date_review_completed', {}, stamp, taskSnapshot);
    if (previous.needsTimeReview && !next.needsTimeReview)
      trackQAEvent('time_review_completed', {}, stamp, taskSnapshot);
  }

  function trackManualAfterCapture(taskSnapshot: Task[], timestamp: Date) {
    if (!qaMode || !captureFlowRef.current.hasExtraction || captureFlowRef.current.manualAfterCaptureTracked) return;
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
      // fall through
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
    if (!window.confirm('Clear the local QA event log and notes?')) return;
    setQaData({ events: [], feedback: [] });
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
    setQaData((current) => ({ ...current, feedback: [feedback, ...current.feedback].slice(0, 100) }));
    showToast('QA note saved.');
  }

  async function handleFileImport(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    setImportFileName(file.name);
    setImportProcessing(true);
    if (ext === 'txt' || ext === 'md') {
      try {
        const text = await readFileAsText(file);
        setImportFileText(text);
        setCaptureText(text);
        setImportProcessing(false);
        runExtraction(text);
      } catch {
        setImportProcessing(false);
        showToast('Could not read file.');
      }
    } else {
      setImportProcessing(false);
      showToast('Export as .txt or .md to import.');
    }
  }

  function handleScreenshotImport(file: File) {
    setImportFileName(file.name);
    const url = URL.createObjectURL(file);
    setImportImageSrc(url);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTasks((current) => normalizeTasksForToday(current, now));
  }, [now]);

  useEffect(() => {
    saveAppData({ version: '0.1', tasks, logs });
  }, [tasks, logs]);

  useEffect(() => {
    saveQAData(qaData);
  }, [qaData]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!qaMode || qaOpenTrackedRef.current) return;
    qaOpenTrackedRef.current = true;
    const stamp = new Date();
    const displayMode = getDisplayMode();
    const metadata = buildQAMetadata(tasks, { displayMode });
    const openEvents = [createQAEvent('app_open', stamp, metadata)];
    if (displayMode === 'standalone') openEvents.unshift(createQAEvent('standalone_open', stamp, metadata));
    setQaData((current) => ({ ...current, events: [...openEvents, ...current.events].slice(0, 800) }));
  }, [qaMode, tasks]);

  useEffect(() => {
    if (!qaMode) return;
    if (activeView === 'import') trackQAEvent('capture_opened');
    if (activeView === 'settings') trackQAEvent('settings_opened');
  }, [activeView, qaMode]);

  useEffect(() => {
    if (!qaMode || activeView !== 'today') return;
    const currentTaskId = recommendation.task?.id ?? null;
    if (!currentTaskId) { lastNowTaskIdRef.current = null; return; }
    if (lastNowTaskIdRef.current === currentTaskId) return;
    if (lastNowTaskIdRef.current) {
      trackQAEvent('now_card_changed', {
        previousNowTaskId: lastNowTaskIdRef.current,
        nowTaskId: currentTaskId
      });
    }
    trackQAEvent('now_card_viewed', { nowTaskId: currentTaskId });
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
      trackQAEvent('manual_task_created', { source, itemType: task.itemType }, stamp, nextTasks);
      setManualEditorOpen(false);
    }
    if (task.alarmEnabled) {
      trackQAEvent(
        'alarm_option_selected',
        { itemType: task.itemType, alarmBeforeMinutes: task.alarmBeforeMinutes, alarmSelectionCount: 1 },
        stamp, nextTasks
      );
    }
    if (task.needsDateReview || task.needsTimeReview) {
      trackQAEvent(
        'item_marked_needs_review',
        { itemsNeedingDateReviewCount: task.needsDateReview ? 1 : 0, itemsNeedingTimeReviewCount: task.needsTimeReview ? 1 : 0 },
        stamp, nextTasks
      );
    }
    if (task.calendarReady) trackQAEvent('calendar_export_available', { calendarReadyCount: 1 }, stamp, nextTasks);
    showToast(source === 'capture' ? "Saved. You don't have to retype it later." : 'Saved.');
    setActiveView('today');
  }

  function updateTask(taskId: string, draft: TaskDraft) {
    const stamp = new Date();
    const previousTask = tasks.find((task) => task.id === taskId);
    if (!previousTask) return;
    const nextDraft = applyDraftScheduling(draft, stamp);
    const nextTask = { ...previousTask, ...nextDraft, title: nextDraft.title.trim(), memo: nextDraft.memo.trim() };
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
        { itemType: nextTask.itemType, alarmBeforeMinutes: nextTask.alarmBeforeMinutes, alarmSelectionCount: 1 },
        stamp, nextTasks
      );
    }
    if (nextTask.calendarReady && !previousTask.calendarReady)
      trackQAEvent('calendar_export_available', { calendarReadyCount: 1 }, stamp, nextTasks);
    setEditingTask(null);
    showToast('Changes saved.');
  }

  function completeTask(taskId: string) {
    const stamp = new Date();
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: 'completed' as const, completedAt: stamp.toISOString(), excludedToday: false, excludedOnDate: undefined, snoozeUntil: undefined }
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
    if (!target || !window.confirm(`Delete "${target.title}"?`)) return;
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
    if (!window.confirm('Replace your current data with sample items?')) return;
    const stamp = new Date();
    const restoredTasks = sampleTasks(stamp);
    setTasks(restoredTasks);
    setLogs([createLog('restoredSamples', stamp)]);
    clearCaptureComposer();
    clearImportState();
    captureFlowRef.current = { hasExtraction: false, manualAfterCaptureTracked: false };
    trackQAEvent('sample_tasks_restored', {}, stamp, restoredTasks);
    setActiveView('today');
    showToast('Sample items restored.');
  }

  function clearAll() {
    if (!window.confirm('Reset all local data? This cannot be undone.')) return;
    const stamp = new Date();
    setTasks([]);
    setLogs([]);
    clearCaptureComposer();
    clearImportState();
    captureFlowRef.current = { hasExtraction: false, manualAfterCaptureTracked: false };
    trackQAEvent('data_reset', {}, stamp, []);
    setActiveView('import');
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
    captureFlowRef.current = { hasExtraction: true, manualAfterCaptureTracked: false };
    trackQAEvent('extraction_run', {
      detectedItemsCount: candidates.length,
      extractedTaskCount: counts.task,
      extractedEventCount: counts.event,
      extractedReminderCount: counts.reminder
    });
    if (calendarReadyCount > 0) trackQAEvent('calendar_export_available', { calendarReadyCount }, stamp);
    if (reviewCountsForCandidates.needsDateReviewCount || reviewCountsForCandidates.needsTimeReviewCount) {
      trackQAEvent('item_marked_needs_review', {
        itemsNeedingDateReviewCount: reviewCountsForCandidates.needsDateReviewCount,
        itemsNeedingTimeReviewCount: reviewCountsForCandidates.needsTimeReviewCount
      }, stamp);
    }
    if (candidates.length === 0) {
      showToast('Nothing clear yet. Try shorter lines or one note at a time.');
      return;
    }
    showToast(`Found ${candidates.length} follow-up${candidates.length === 1 ? '' : 's'}.`);
    setActiveView('inbox');
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
      .filter((c) => c.selected && c.title.trim())
      .map((c) => applyDraftScheduling({ ...c, title: c.title.trim(), memo: c.memo.trim() }, new Date()));
    if (selected.length === 0) { showToast('Select at least one item to save.'); return; }
    const stamp = new Date();
    const createdTasks = selected.map((c) => createTaskFromDraft(c, stamp, 'capture'));
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
    setLogs((current) =>
      [...createdTasks.map((t) => createLog('captured', stamp, t.id)), ...current].slice(0, 300)
    );
    setCaptureText('');
    setCaptureCandidates([]);
    setCaptureOutcome(outcome);
    captureFlowRef.current = { hasExtraction: true, manualAfterCaptureTracked: false };
    trackQAEvent('capture_items_saved', {
      savedDetectedItemsCount: selected.length,
      savedTaskCount: counts.task,
      savedEventCount: counts.event,
      savedReminderCount: counts.reminder,
      manualEntriesAvoidedApprox: outcome.manualEntriesAvoidedApprox
    }, stamp, nextTasks);
    if (calendarReadyCount > 0) trackQAEvent('calendar_export_available', { calendarReadyCount }, stamp, nextTasks);
    if (nextReviewCounts.needsDateReviewCount || nextReviewCounts.needsTimeReviewCount) {
      trackQAEvent('item_marked_needs_review', {
        itemsNeedingDateReviewCount: nextReviewCounts.needsDateReviewCount,
        itemsNeedingTimeReviewCount: nextReviewCounts.needsTimeReviewCount
      }, stamp, nextTasks);
    }
    const alarmSelections = selected.filter((item) => item.alarmEnabled).length;
    if (alarmSelections > 0) trackQAEvent('alarm_option_selected', { alarmSelectionCount: alarmSelections }, stamp, nextTasks);
    showToast("Saved. You don't have to retype it later.");
    setActiveView('today');
  }

  function updateCaptureCandidate(candidateId: string, updates: Partial<CaptureCandidate>) {
    const previousCandidate = captureCandidates.find((c) => c.id === candidateId);
    if (!previousCandidate) return;
    const nextCandidate = refreshCaptureCandidate({ ...previousCandidate, ...updates }, new Date());
    setCaptureCandidates((current) => current.map((c) => (c.id === candidateId ? nextCandidate : c)));
    trackReviewCompletion(previousCandidate, nextCandidate, new Date());
  }

  function updateCaptureCandidateAlarm(candidateId: string, alarmEnabled: boolean, alarmBeforeMinutes: number | null) {
    const previousCandidate = captureCandidates.find((c) => c.id === candidateId);
    if (!previousCandidate) return;
    const nextCandidate = updateAlarmPreference(previousCandidate, alarmEnabled, alarmBeforeMinutes);
    setCaptureCandidates((current) => current.map((c) => (c.id === candidateId ? nextCandidate : c)));
    trackQAEvent('alarm_option_selected', { itemType: nextCandidate.itemType, alarmBeforeMinutes, alarmSelectionCount: 1 });
  }

  async function previewCopyDetails(candidate: CaptureCandidate) {
    const success = await copyEventDetails(candidate);
    if (success) trackQAEvent('event_details_copied', { eventDetailsCopiedCount: 1 });
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

  function renderCaptureGroup(type: ItemType) {
    const items = captureCandidates.filter(
      (c) => c.itemType === type && !c.needsDateReview && !c.needsTimeReview && c.confidence !== 'low'
    );
    if (items.length === 0) return null;
    return (
      <section key={type} className="capture-group">
        <div className="section-heading">
          <div>
            <h2>{ITEM_LABEL[type]}</h2>
            <p>{items.length} item{items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="stack">
          {items.map((candidate) => (
            <CaptureCandidateCard
              key={candidate.id}
              candidate={candidate}
              onToggleSelected={(id, selected) => updateCaptureCandidate(id, { selected })}
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
    const items = captureCandidates.filter((c) => c.needsDateReview || c.needsTimeReview);
    if (items.length === 0) return null;
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
              onToggleSelected={(id, selected) => updateCaptureCandidate(id, { selected })}
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

  function renderTodayView() {
    const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const todayAgenda = sortedTasks.filter(
      (t) =>
        t.status === 'active' &&
        (t.due === 'today' || t.parsedDate === todayKey || t.needsDateReview || t.needsTimeReview)
    );

    return (
      <section className="view">
        <header className="hero-card hero-card--capture hero-card--compact">
          <div>
            <div className="today-date">{todayLabel}</div>
            <h1>Today</h1>
            {activeTasks.length > 0 ? (
              <p>
                {todayFollowUpsCount} due today
                {reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount > 0
                  ? ` · ${reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount} to review`
                  : null}
              </p>
            ) : (
              <p>Your schedule, organized.</p>
            )}
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('import')}>
            Import
          </button>
        </header>

        <NowCard
          task={recommendation.task}
          reasons={recommendation.reasons}
          onComplete={completeTask}
          onSnooze={snoozeTask}
          onSkipToday={skipToday}
          onOpenCapture={() => setActiveView('import')}
          onManualAdd={() => setManualEditorOpen(true)}
        />

        {todayAgenda.length > 0 ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div>
                <h2>Today's agenda</h2>
                <p>{todayAgenda.length} item{todayAgenda.length === 1 ? '' : 's'}</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setActiveView('calendar')}>
                Calendar
              </button>
            </div>
            <div className="stack">
              {todayAgenda.slice(0, 5).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={setEditingTask}
                  onDelete={deleteTask}
                  onDownloadICS={handleDownloadICS}
                  onCopyDetails={handleCopyDetails}
                />
              ))}
              {todayAgenda.length > 5 ? (
                <button type="button" className="ghost-button" onClick={() => setActiveView('calendar')}>
                  +{todayAgenda.length - 5} more in calendar
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {nextCandidates.length > 0 ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div>
                <h2>Up next</h2>
                <p>A few more worth seeing.</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setActiveView('calendar')}>
                View all
              </button>
            </div>
            <div className="stack">
              {nextCandidates.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onEdit={setEditingTask}
                  onDelete={deleteTask}
                  onDownloadICS={handleDownloadICS}
                  onCopyDetails={handleCopyDetails}
                />
              ))}
            </div>
          </section>
        ) : null}

        {captureCandidates.length > 0 ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div>
                <h2>Pending review</h2>
                <p>{captureCandidates.length} item{captureCandidates.length === 1 ? '' : 's'} to confirm</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setActiveView('inbox')}>
                Review
              </button>
            </div>
          </section>
        ) : null}

        {activeTasks.length === 0 && captureCandidates.length === 0 ? (
          <section className="panel panel--quiet">
            <div className="empty-state">
              <h3>Nothing scheduled yet.</h3>
              <p>Import a file to get your schedule organized.</p>
              <button type="button" className="primary-button" onClick={() => setActiveView('import')}>
                Import
              </button>
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  function renderCalendarView() {
    const prevMonth = () => {
      if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
      else setCalMonth((m) => m - 1);
    };
    const nextMonth = () => {
      if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
      else setCalMonth((m) => m + 1);
    };

    const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const blanks = Array.from({ length: firstDow });
    const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDayKey = (n: number) => toDateKey(new Date(calYear, calMonth, n));

    const getDayTasks = (dateKey: string) =>
      sortedTasks.filter(
        (t) =>
          t.status === 'active' &&
          (t.parsedDate === dateKey ||
            (t.due === 'today' && dateKey === todayKey) ||
            (t.due === 'tomorrow' && dateKey === tomorrowKey))
      );

    const selectedDateTasks = selectedCalDate ? getDayTasks(selectedCalDate) : [];
    const selectedDateLabel = selectedCalDate
      ? new Date(selectedCalDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
      : '';

    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Calendar</div>
            <h1>Schedule</h1>
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('import')}>
            Import
          </button>
        </header>

        <section className="panel panel--quiet">
          <div className="cal-nav">
            <button type="button" className="ghost-button tiny-button" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" className="ghost-button tiny-button" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="cal-grid">
            {CAL_DOW.map((d) => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {blanks.map((_, i) => (
              <div key={`b${i}`} className="cal-day cal-day--empty" />
            ))}
            {dayNums.map((n) => {
              const dk = getDayKey(n);
              const count = getDayTasks(dk).length;
              const hasReview = sortedTasks.some(
                (t) => t.status === 'active' && t.parsedDate === dk && (t.needsDateReview || t.needsTimeReview)
              );
              const cls = [
                'cal-day',
                dk === todayKey ? 'is-today' : '',
                dk === selectedCalDate ? 'is-selected' : '',
                count > 0 ? 'has-items' : '',
                hasReview ? 'has-review' : ''
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={dk}
                  type="button"
                  className={cls}
                  onClick={() => setSelectedCalDate(dk === selectedCalDate ? null : dk)}
                >
                  {n}
                  {count > 0 ? <span className="cal-day__dot" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        {selectedCalDate ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div>
                <h2>{selectedDateLabel}</h2>
                <p>{selectedDateTasks.length} item{selectedDateTasks.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {selectedDateTasks.length > 0 ? (
              <div className="stack">
                {selectedDateTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={completeTask}
                    onEdit={setEditingTask}
                    onDelete={deleteTask}
                    onDownloadICS={handleDownloadICS}
                    onCopyDetails={handleCopyDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Nothing scheduled for this day.</p>
              </div>
            )}
          </section>
        ) : (
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
        )}
      </section>
    );
  }

  function renderImportView() {
    return (
      <section className="view">
        <header className="hero-card hero-card--capture hero-card--compact">
          <AppHeader
            title="Drop a file. Get your schedule organized."
            subtitle="Upload meeting notes, screenshots, or recordings. We'll find the follow-ups."
            showBrand
          />
        </header>

        {importMode === null ? (
          <div className="import-card-grid">
            <button type="button" className="import-card" onClick={() => setImportMode('file')}>
              <div className="import-card__label">Meeting file</div>
              <div className="import-card__hint">.txt · .md</div>
            </button>
            <button type="button" className="import-card" onClick={() => setImportMode('screenshot')}>
              <div className="import-card__label">Screenshot</div>
              <div className="import-card__hint">png · jpg · webp</div>
            </button>
            <button type="button" className="import-card is-disabled">
              <div className="import-card__label">Recording</div>
              <div className="import-card__hint">Not available in web version</div>
            </button>
            <button type="button" className="import-card" onClick={() => setImportMode('text')}>
              <div className="import-card__label">Text</div>
              <div className="import-card__hint">Paste or type</div>
            </button>
          </div>
        ) : importMode === 'file' ? (
          <section className="panel panel--capture">
            <div className="section-heading">
              <div>
                <h2>Meeting file</h2>
                <p>.txt and .md supported</p>
              </div>
              <button type="button" className="ghost-button" onClick={clearImportState}>
                Back
              </button>
            </div>
            {importProcessing ? (
              <p className="subcopy">Reading file…</p>
            ) : importFileName ? (
              <div className="stack--tight">
                <p><strong>{importFileName}</strong></p>
                {importFileText ? (
                  <div className="import-file-preview">
                    {importFileText.slice(0, 240)}{importFileText.length > 240 ? '…' : ''}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="stack--tight">
                <label className="file-label-button">
                  Choose file
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileImport(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="subcopy">.txt and .md files parse immediately. PDF and DOCX: export as .txt first.</p>
              </div>
            )}
          </section>
        ) : importMode === 'screenshot' ? (
          <section className="panel panel--capture">
            <div className="section-heading">
              <div>
                <h2>Screenshot</h2>
                <p>Upload an image</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  if (importImageSrc) URL.revokeObjectURL(importImageSrc);
                  setImportImageSrc('');
                  setImportFileName('');
                  setImportMode(null);
                }}
              >
                Back
              </button>
            </div>
            {importImageSrc ? (
              <div className="stack--tight">
                <img src={importImageSrc} alt="Uploaded screenshot" className="screenshot-preview" />
                <p className="subcopy">Text extraction from images is not available in the web version.</p>
              </div>
            ) : (
              <div className="stack--tight">
                <label className="file-label-button">
                  Choose image
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotImport(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </section>
        ) : importMode === 'recording' ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div><h2>Recording</h2></div>
              <button type="button" className="ghost-button" onClick={() => setImportMode(null)}>
                Back
              </button>
            </div>
            <p>Not available in web version.</p>
            <p className="subcopy">Transcription is supported in the mobile app.</p>
          </section>
        ) : importMode === 'text' ? (
          <section className="panel panel--capture">
            <div className="section-heading">
              <div><h2>Paste text</h2></div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => { setImportMode(null); clearCaptureComposer(); }}
              >
                Back
              </button>
            </div>
            <label className="field field--spacious">
              <span>Meeting notes, message, or plan</span>
              <textarea
                rows={7}
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Paste a message, meeting note, or plan..."
              />
            </label>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={parseCaptureText}>
                Extract
              </button>
              <button type="button" className="ghost-button" onClick={trySampleCapture}>
                Try sample
              </button>
              {captureText.trim() ? (
                <button type="button" className="ghost-button" onClick={clearCaptureComposer}>
                  Clear
                </button>
              ) : null}
            </div>
            <p className="subcopy">{brand.privacyLine}</p>
          </section>
        ) : null}

        {captureOutcome ? (
          <section className="panel panel--success">
            <div className="section-heading">
              <div>
                <h2>Saved {captureOutcome.savedCount} follow-up{captureOutcome.savedCount === 1 ? '' : 's'}.</h2>
                <p>{captureOutcome.calendarReadyCount} calendar-ready.</p>
              </div>
              <div className="action-row">
                <button type="button" className="secondary-button" onClick={() => setActiveView('today')}>
                  View today
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { clearCaptureComposer(); clearImportState(); }}
                >
                  Import another
                </button>
              </div>
            </div>
          </section>
        ) : hasSavedItems ? (
          <section className="panel panel--quiet">
            <div className="section-heading">
              <div><h2>Your schedule</h2></div>
              <button type="button" className="ghost-button" onClick={() => setActiveView('today')}>
                View today
              </button>
            </div>
            <div className="meta-row meta-row--summary">
              <span>Today {todayFollowUpsCount}</span>
              <span>Review {reviewCounts.needsDateReviewCount + reviewCounts.needsTimeReviewCount}</span>
              <span>Calendar {calendarNotExportedCount}</span>
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  function renderInboxView() {
    const pendingCount = captureCandidates.length;
    const lowConfidenceCandidates = captureCandidates.filter(
      (c) => !c.needsDateReview && !c.needsTimeReview && c.confidence === 'low'
    );

    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Inbox</div>
            <h1>Review before saving</h1>
            {pendingCount > 0 ? (
              <p>We found {pendingCount} follow-up{pendingCount === 1 ? '' : 's'}.</p>
            ) : (
              <p>Confirm once. We'll organize the rest.</p>
            )}
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('import')}>
            Import
          </button>
        </header>

        {pendingCount > 0 ? (
          <>
            <div className="capture-save-bar">
              <div>
                <strong>{selectedCaptureCandidates.length} ready to save</strong>
                <p>
                  {selectedCaptureCalendarReadyCount} calendar-ready.{' '}
                  {selectedCaptureReviewCounts.needsDateReviewCount + selectedCaptureReviewCounts.needsTimeReviewCount} need review.
                </p>
              </div>
              <button type="button" className="primary-button" onClick={saveCaptureCandidates}>
                Save selected
              </button>
            </div>
            <section className="panel panel--quiet">
              <div className="section-heading">
                <div>
                  <h2>{pendingCount} follow-up{pendingCount === 1 ? '' : 's'} found</h2>
                  <p>
                    {getCalendarReadyCount(captureCandidates)} calendar-ready.{' '}
                    {captureReviewCounts.needsDateReviewCount + captureReviewCounts.needsTimeReviewCount} need review.
                  </p>
                </div>
              </div>
              <div className="stack">
                {renderCaptureGroup('task')}
                {renderCaptureGroup('event')}
                {renderCaptureGroup('reminder')}
                {renderNeedsReviewGroup()}
                {lowConfidenceCandidates.length > 0 ? (
                  <section className="capture-group">
                    <div className="section-heading">
                      <div>
                        <h2>Low confidence</h2>
                        <p>{lowConfidenceCandidates.length} item{lowConfidenceCandidates.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div className="stack">
                      {lowConfidenceCandidates.map((c) => (
                        <CaptureCandidateCard
                          key={c.id}
                          candidate={c}
                          onToggleSelected={(id, selected) => updateCaptureCandidate(id, { selected })}
                          onChange={updateCaptureCandidate}
                          onAlarmChange={updateCaptureCandidateAlarm}
                          onPreviewDownload={previewDownloadICS}
                          onPreviewCopy={previewCopyDetails}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </section>
          </>
        ) : captureOutcome ? (
          <section className="panel panel--success">
            <div className="section-heading">
              <div>
                <h2>Saved {captureOutcome.savedCount} follow-up{captureOutcome.savedCount === 1 ? '' : 's'}.</h2>
                <p>{getCaptureOutcomeText(captureOutcome.manualEntriesAvoidedApprox)}</p>
              </div>
              <div className="action-row">
                <button type="button" className="secondary-button" onClick={() => setActiveView('today')}>
                  View today
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { clearCaptureComposer(); setActiveView('import'); }}
                >
                  Import more
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel panel--quiet">
            <div className="empty-state">
              <h3>No pending imports.</h3>
              <p>Import a file or paste text to get started.</p>
              <button type="button" className="primary-button" onClick={() => setActiveView('import')}>
                Go to Import
              </button>
            </div>
          </section>
        )}

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div><h2>Saved items</h2></div>
            <button type="button" className="ghost-button" onClick={() => setManualEditorOpen(true)}>
              Add manually
            </button>
          </div>
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
                <h3>No saved follow-ups yet.</h3>
              </div>
            )}
          </div>
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
            <p>Local-first privacy.</p>
          </div>
        </header>

        <section className="panel panel--quiet">
          <h2>Privacy</h2>
          <p>Only what you upload. No account.</p>
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
          <p>Version {brand.version}</p>
        </section>
      </section>
    );
  }

  function renderView() {
    switch (activeView) {
      case 'today':
        return renderTodayView();
      case 'calendar':
        return renderCalendarView();
      case 'import':
        return renderImportView();
      case 'inbox':
        return renderInboxView();
      case 'settings':
        return renderSettingsView();
    }
  }

  return (
    <div className="app-shell">
      <div className="device-frame">
        <div className="app-surface">
          <main className="app-main">{renderView()}</main>
        </div>
      </div>
      <BottomNav activeView={activeView} onChange={setActiveView} />

      {manualEditorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setManualEditorOpen(false)}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <TaskEditor
              title="Add manually"
              description="Use this when import misses something."
              submitLabel="Save item"
              onSubmit={(draft) => addTask(draft)}
              onCancel={() => setManualEditorOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditingTask(null)}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <TaskEditor
              initialValue={editingTask}
              title="Edit item"
              description="Change what you need, then save."
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

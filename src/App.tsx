import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { CaptureCandidateCard } from './components/CaptureCandidateCard';
import { FounderQAPanel } from './components/FounderQAPanel';
import { NowCard } from './components/NowCard';
import { TaskCard } from './components/TaskCard';
import { TaskEditor } from './components/TaskEditor';
import { sampleTasks } from './data/sampleTasks';
import { extractCaptureCandidates, SAMPLE_CAPTURE_TEXT } from './lib/capture';
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
  applyFeedback,
  createLog,
  createTaskFromDraft,
  getPostponeWeight,
  normalizeTasksForToday
} from './lib/tasks';
import { formatDateLabel, formatTimeLabel, getGreetingCopy, plusMinutes, toDateKey } from './lib/time';
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
    return ranked.filter(
      (task) =>
        task.status === 'active' &&
        (!task.excludedToday || task.excludedOnDate !== toDateKey(now)) &&
        (!task.snoozeUntil || new Date(task.snoozeUntil).getTime() <= now.getTime())
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
  const completedToday = tasks
    .filter(
      (task) =>
        task.status === 'completed' &&
        task.completedAt &&
        toDateKey(new Date(task.completedAt)) === toDateKey(now)
    )
    .sort(
      (left, right) =>
        new Date(right.completedAt ?? right.createdAt).getTime() -
        new Date(left.completedAt ?? left.createdAt).getTime()
    );
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
  const savedItemCounts = getItemCounts(tasks);
  const dueSoonCount = activeTasks.filter((task) => task.due === 'today' || task.due === 'tomorrow').length;
  const capturedCount = tasks.filter((task) => task.source === 'capture').length;

  function showToast(message: string) {
    setToastMessage(message);
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

  function trackManualAfterCapture(taskSnapshot: Task[], timestamp: Date) {
    if (!qaMode || !captureFlowRef.current.hasExtraction || captureFlowRef.current.manualAfterCaptureTracked) {
      return;
    }

    captureFlowRef.current.manualAfterCaptureTracked = true;
    trackQAEvent('used_manual_add_after_capture', {}, timestamp, taskSnapshot);
  }

  async function copyQASummary() {
    const summaryText = buildQASummaryText(qaSummary, qaData.feedback);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
        showToast('QA summary copied.');
        return;
      }
    } catch {
      // Fall through to manual copy fallback.
    }

    const helper = document.createElement('textarea');
    helper.value = summaryText;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'absolute';
    helper.style.left = '-9999px';
    document.body.appendChild(helper);
    helper.select();

    const success = document.execCommand('copy');
    document.body.removeChild(helper);
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
    if (!qaMode || activeView !== 'today') {
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
      showToast('Manual task saved. Capture is still the fastest path.');
    } else {
      showToast('Saved.');
    }

    setActiveView('today');
  }

  function updateTask(taskId: string, draft: TaskDraft) {
    const stamp = new Date();

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...draft,
              title: draft.title.trim(),
              memo: draft.memo.trim()
            }
          : task
      )
    );
    pushLog('edited', stamp, taskId);
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
    trackQAEvent('now_card_done', { nowTaskId: taskId }, stamp, updatedTasks);
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
    setCaptureText('');
    setCaptureCandidates([]);
    setCaptureOutcome(null);
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
    setCaptureText('');
    setCaptureCandidates([]);
    setCaptureOutcome(null);
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

    const candidates = extractCaptureCandidates(input);
    const counts = getItemCounts(candidates);

    setCaptureCandidates(candidates);
    setCaptureOutcome(null);
    captureFlowRef.current = {
      hasExtraction: true,
      manualAfterCaptureTracked: false
    };

    trackQAEvent('extraction_run', {
      detectedItemsCount: candidates.length,
      captureCandidateCount: candidates.length,
      extractedTaskCount: counts.task,
      extractedEventCount: counts.event,
      extractedReminderCount: counts.reminder
    });

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
      .map((candidate) => ({
        ...candidate,
        title: candidate.title.trim(),
        memo: candidate.memo.trim()
      }));

    if (selected.length === 0) {
      showToast('Select at least one item to save.');
      return;
    }

    const stamp = new Date();
    const createdTasks = selected.map((candidate) => createTaskFromDraft(candidate, stamp, 'capture'));
    const nextTasks = [...createdTasks, ...tasks];
    const counts = getItemCounts(selected);
    const outcome: CaptureOutcome = {
      detectedCount: captureCandidates.length,
      savedCount: selected.length,
      savedTaskCount: counts.task,
      savedEventCount: counts.event,
      savedReminderCount: counts.reminder,
      manualEntriesAvoidedApprox: selected.length
    };

    setTasks((current) => [...createdTasks, ...current]);
    setLogs((current) => [
      ...createdTasks.map((task) => createLog('captured', stamp, task.id)),
      ...current
    ].slice(0, 300));
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

    showToast('Saved. Now you do not have to retype it later.');
  }

  function updateCaptureCandidate(candidateId: string, updates: Partial<CaptureCandidate>) {
    setCaptureCandidates((current) =>
      current.map((candidate) => (candidate.id === candidateId ? { ...candidate, ...updates } : candidate))
    );
  }

  function renderTodayView() {
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
          onManualAdd={() => setActiveView('add')}
        />

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Captured locally</div>
            <strong>{capturedCount}</strong>
            <p>Saved from pasted notes, messages, or plans.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Due soon</div>
            <strong>{dueSoonCount}</strong>
            <p>Items that look time-sensitive.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Often delayed</div>
            <strong>{delaySummary.title}</strong>
            <p>{delaySummary.detail}</p>
          </article>
        </section>

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>Keep moving</h2>
              <p>This list exists to support the follow-through layer, not replace Capture.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveView('add')}>
              Add manually
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
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>Nothing else needs to compete right now.</h3>
                <p>Capture another message or add a fallback task if you need one.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderAddView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Manual fallback</div>
            <h1>Add manually</h1>
            <p>Use this when there is nothing useful to capture.</p>
          </div>
        </header>

        <TaskEditor
          title="Add manually"
          description="Keep it short. The point is to avoid typing whenever you can."
          submitLabel="Save manual task"
          onSubmit={(draft) => addTask(draft)}
        />
      </section>
    );
  }

  function renderListView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Tasks</div>
            <h1>Saved items</h1>
            <p>Tasks, events, and reminders saved locally after capture or manual fallback.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('capture')}>
            Capture more
          </button>
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
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>No saved items in this view.</h3>
              <p>Paste a message or plan in Capture and we will fill this in for you.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCaptureGroup(type: ItemType) {
    const items = captureCandidates.filter((candidate) => candidate.itemType === type);

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
            />
          ))}
        </div>
      </section>
    );
  }

  function renderCaptureView() {
    return (
      <section className="view">
        <header className="hero-card hero-card--capture">
          <div className="eyebrow">What's Next</div>
          <h1>Stop retyping tasks and plans.</h1>
          <p>
            Paste a message or meeting note for now. What's Next turns it into tasks and calendar-ready
            events.
          </p>
          <div className="hero-card__footer">
            <span>Capture now. Decide later.</span>
            <span>We only use what you paste here.</span>
            <span>No automatic message reading in this PWA.</span>
          </div>
        </header>

        <section className="panel panel--quiet roadmap-note">
          <div className="section-heading">
            <div>
              <h2>Capture test</h2>
              <p>Testing capture quality here. Native shortcuts and share-sheet capture come next.</p>
            </div>
          </div>
          <p className="subcopy">
            Share from Messages, Mail, Notes, or Calendar later. Save to Calendar and Reminders later.
          </p>
        </section>

        <section className="panel panel--capture">
          <label className="field field--spacious">
            <span>Paste a message, meeting note, or plan</span>
            <textarea
              rows={9}
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Example: Sarah can do a project check-in tomorrow at 3 PM on Zoom. Please send the revised intro before lunch and remember to book the dentist appointment this week."
            />
          </label>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={parseCaptureText}>
              Extract
            </button>
            <button type="button" className="ghost-button" onClick={trySampleCapture}>
              Try sample
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('add')}>
              Add manually
            </button>
          </div>
          <p className="subcopy">The PWA only works with text you paste here. Nothing is read automatically.</p>
        </section>

        {captureOutcome ? (
          <section className="panel panel--success">
            <div className="section-heading">
              <div>
                <h2>Typing saved</h2>
                <p>Saved. Now you do not have to retype it later.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setActiveView('today')}>
                View what's next
              </button>
            </div>
            <div className="summary-grid summary-grid--three">
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Detected</div>
                <strong>{captureOutcome.detectedCount}</strong>
                <p>Items found in the pasted text.</p>
              </article>
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Saved</div>
                <strong>{captureOutcome.savedCount}</strong>
                <p>
                  {captureOutcome.savedTaskCount} tasks, {captureOutcome.savedEventCount} events,{' '}
                  {captureOutcome.savedReminderCount} reminders
                </p>
              </article>
              <article className="summary-card summary-card--quiet">
                <div className="eyebrow">Typing saved</div>
                <strong>{captureOutcome.manualEntriesAvoidedApprox}</strong>
                <p>{getCaptureOutcomeText(captureOutcome.manualEntriesAvoidedApprox)}</p>
              </article>
            </div>
          </section>
        ) : null}

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>Detected items</h2>
              <p>
                {captureCandidates.length > 0
                  ? 'Select what to keep. Edit anything before you save it.'
                  : 'Paste something messy and we will sort it into tasks, events, and reminders.'}
              </p>
            </div>
            {captureCandidates.length > 0 ? (
              <button type="button" className="secondary-button" onClick={saveCaptureCandidates}>
                Save selected
              </button>
            ) : null}
          </div>

          {captureCandidates.length > 0 ? (
            <>
              <div className="meta-row meta-row--summary">
                <span>{captureCandidateCounts.task} tasks</span>
                <span>{captureCandidateCounts.event} events</span>
                <span>{captureCandidateCounts.reminder} reminders</span>
              </div>
              <div className="stack">
                {renderCaptureGroup('task')}
                {renderCaptureGroup('event')}
                {renderCaptureGroup('reminder')}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No extraction yet.</h3>
              <p>Throw messy text here first. The point is to avoid organizing it by hand.</p>
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
            <p>Just enough to test the capture-first product honestly.</p>
          </div>
        </header>

        <section className="panel panel--quiet">
          <h2>Privacy</h2>
          <p>We only use what you paste here. No automatic message reading in this PWA.</p>
        </section>

        <section className="panel panel--quiet">
          <h2>Native direction</h2>
          <p>Share sheet capture, Calendar save, Reminders save, widgets, and App Intents belong in native iOS.</p>
        </section>

        <section className="panel panel--quiet">
          <h2>Home Screen test</h2>
          <p>Add What's Next to your iPhone Home Screen and use it for three days before paying for native work.</p>
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
          <p>PWA capture test v0.1</p>
        </section>
      </section>
    );
  }

  function renderView() {
    switch (activeView) {
      case 'today':
        return renderTodayView();
      case 'add':
        return renderAddView();
      case 'list':
        return renderListView();
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

      {editingTask ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditingTask(null)}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <TaskEditor
              initialValue={editingTask}
              title="Edit item"
              description="Keep the smallest useful edit. The point is still to move fast."
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

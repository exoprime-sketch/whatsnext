import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { FounderQAPanel } from './components/FounderQAPanel';
import { NowCard } from './components/NowCard';
import { TaskCard } from './components/TaskCard';
import { TaskEditor } from './components/TaskEditor';
import { sampleTasks } from './data/sampleTasks';
import { extractTaskCandidates } from './lib/capture';
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
import { formatDateLabel, formatTimeLabel, getDueLabel, getGreetingCopy, plusMinutes, toDateKey } from './lib/time';
import type {
  ActivityLog,
  AppView,
  CaptureCandidate,
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

const BEST_TIME_LABEL = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Any time'
} as const;

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
      detail: "You don't have a task getting pushed over and over."
    };
  }

  const topTask = postponedTasks[0];
  const count = getPostponeWeight(topTask);

  return {
    title: topTask.title,
    detail: `Delayed ${count} ${count === 1 ? 'time' : 'times'}.`
  };
}

export default function App() {
  const [now, setNow] = useState(() => new Date());
  const [initialData] = useState(() => loadAppData(new Date()));
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [logs, setLogs] = useState<ActivityLog[]>(initialData.logs);
  const [activeView, setActiveView] = useState<AppView>('today');
  const [listFilter, setListFilter] = useState<TaskFilter>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [captureText, setCaptureText] = useState('');
  const [captureCandidates, setCaptureCandidates] = useState<CaptureCandidate[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [qaMode, setQaMode] = useState(() => initializeQAMode());
  const [qaData, setQaData] = useState<QAData>(() => loadQAData());
  const qaOpenTrackedRef = useRef(false);
  const lastNowTaskIdRef = useRef<string | null>(null);

  const greeting = getGreetingCopy(now);
  const recommendation = getNowRecommendation(tasks, now);
  const sortedTasks = sortTasksByRecommendation(tasks, now);
  const visibleTasks = getVisibleTasks(listFilter, tasks, now);
  const activeTasks = tasks.filter((task) => task.status === 'active');
  const completedTaskCount = tasks.length - activeTasks.length;
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

  function trackTaskCreated(taskSnapshot: Task[], source: Task['source'], timestamp: Date) {
    if (!qaMode) {
      return;
    }

    setQaData((current) => {
      const metadata = buildQAMetadata(taskSnapshot, { source });
      const nextEvents = [createQAEvent('task_created', timestamp, metadata)];

      if (source === 'capture') {
        nextEvents.unshift(
          createQAEvent('capture_candidate_saved', timestamp, buildQAMetadata(taskSnapshot, {
            source,
            captureCandidateCount: 1
          }))
        );
      }

      if (!current.events.some((event) => event.eventName === 'first_task_created')) {
        nextEvents.push(createQAEvent('first_task_created', timestamp, metadata));
      }

      return {
        ...current,
        events: [...nextEvents, ...current.events].slice(0, 800)
      };
    });
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
    trackTaskCreated(nextTasks, source, stamp);
    setActiveView('today');
    showToast(source === 'capture' ? 'Task added.' : 'Added. I picked your next task.');
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
    showToast('Task deleted.');
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
    if (!window.confirm('Replace your current data with sample tasks?')) {
      return;
    }

    const stamp = new Date();
    const restoredTasks = sampleTasks(stamp);
    setTasks(restoredTasks);
    setLogs([createLog('restoredSamples', stamp)]);
    trackQAEvent('sample_tasks_restored', {}, stamp, restoredTasks);
    setActiveView('today');
    showToast('Sample tasks restored.');
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
    trackQAEvent('data_reset', {}, stamp, []);
    setActiveView('today');
    showToast('All local data cleared.');
  }

  function parseCaptureText() {
    const candidates = extractTaskCandidates(captureText);
    setCaptureCandidates(candidates);

    if (captureText.trim()) {
      trackQAEvent('capture_pasted', { captureCandidateCount: candidates.length });
    }

    if (candidates.length === 0) {
      showToast('No clear tasks yet. Try pasting shorter lines.');
      return;
    }

    showToast(`I found ${candidates.length} task suggestions.`);
  }

  function saveCaptureCandidates() {
    const selected = captureCandidates.filter((candidate) => candidate.selected);
    if (selected.length === 0) {
      showToast('Select at least one task to add.');
      return;
    }

    selected.forEach((candidate) => addTask(candidate, 'capture'));
    setCaptureText('');
    setCaptureCandidates([]);
    showToast(`Added ${selected.length} ${selected.length === 1 ? 'task' : 'tasks'}.`);
  }

  function renderTodayView() {
    return (
      <section className="view">
        <header className="hero-card">
          <div className="eyebrow">What's Next</div>
          <h1>One thing to do now.</h1>
          <p>{greeting.status}</p>
          <div className="hero-card__footer">
            <span>{formatDateLabel(now)}</span>
            <span>{formatTimeLabel(now)}</span>
            <span>{greeting.greeting}</span>
          </div>
        </header>

        <NowCard
          task={recommendation.task}
          reasons={recommendation.reasons}
          onComplete={completeTask}
          onSnooze={snoozeTask}
          onSkipToday={skipToday}
          onQuickAdd={() => setActiveView('add')}
        />

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Waiting</div>
            <strong>{activeTasks.length}</strong>
            <p>Tasks still waiting for attention.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Done today</div>
            <strong>{completedToday.length}</strong>
            <p>{completedToday.length > 0 ? 'You already moved something forward.' : 'Nothing finished yet.'}</p>
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
              <h2>Up next</h2>
              <p>Still useful, just not first.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveView('add')}>
              Add a task
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
                <p>Add one task and I'll keep the next move ready.</p>
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
            <div className="eyebrow">Add</div>
            <h1>Add a task</h1>
            <p>Title is enough. I'll use sensible defaults and pick what to do next.</p>
          </div>
        </header>

        <TaskEditor
          title="Quick add"
          description="Keep it simple. This should take about 10 seconds."
          submitLabel="Add and pick next"
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
            <h1>Tasks</h1>
            <p>Everything here exists to support your next move.</p>
          </div>
        </header>

        <section className="summary-grid summary-grid--three">
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Done today</div>
            <strong>{completedToday.length}</strong>
            <p>Completed tasks from today.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Waiting</div>
            <strong>{activeTasks.length}</strong>
            <p>Tasks still active.</p>
          </article>
          <article className="summary-card summary-card--quiet">
            <div className="eyebrow">Often delayed</div>
            <strong>{postponedTasks.length}</strong>
            <p>{delaySummary.detail}</p>
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
              <h3>No tasks in this view.</h3>
              <p>Add one task and I'll pick what to do next.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCaptureView() {
    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">Capture</div>
            <h1>Paste messy notes. Get clean tasks.</h1>
            <p>Paste a message, note, or email snippet. We only use what you paste here.</p>
          </div>
        </header>

        <section className="panel">
          <label className="field">
            <span>Paste text</span>
            <textarea
              rows={6}
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Example: Please send the first draft by tomorrow. Review the calendar before lunch."
            />
          </label>
          <button type="button" className="primary-button" onClick={parseCaptureText}>
            Suggest tasks
          </button>
          <p className="subcopy">We only use what you paste here.</p>
        </section>

        <section className="panel panel--quiet">
          <div className="section-heading">
            <div>
              <h2>Suggested tasks</h2>
              <p>Pick the ones worth keeping.</p>
            </div>
            <button type="button" className="secondary-button" onClick={saveCaptureCandidates}>
              Add selected
            </button>
          </div>

          <div className="stack">
            {captureCandidates.length > 0 ? (
              captureCandidates.map((candidate) => (
                <article key={candidate.id} className="task-card">
                  <div className="task-card__body">
                    <label className="candidate-toggle">
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={(event) =>
                          setCaptureCandidates((current) =>
                            current.map((item) =>
                              item.id === candidate.id ? { ...item, selected: event.target.checked } : item
                            )
                          )
                        }
                      />
                      <span>Select</span>
                    </label>
                    <input
                      className="candidate-input"
                      value={candidate.title}
                      onChange={(event) =>
                        setCaptureCandidates((current) =>
                          current.map((item) =>
                            item.id === candidate.id ? { ...item, title: event.target.value } : item
                          )
                        )
                      }
                    />
                    <div className="meta-row">
                      <span>{candidate.durationMinutes} min</span>
                      {candidate.due !== 'none' ? <span>{getDueLabel(candidate.due)}</span> : null}
                      {candidate.preferredTime !== 'anytime' ? (
                        <span>{BEST_TIME_LABEL[candidate.preferredTime]}</span>
                      ) : null}
                    </div>
                    <p className="task-card__memo">{candidate.rawText}</p>
                  </div>
                  <div className="task-card__actions">
                    <button
                      type="button"
                      className="tiny-button primary"
                      onClick={() => {
                        addTask(candidate, 'capture');
                        setCaptureCandidates((current) => current.filter((item) => item.id !== candidate.id));
                      }}
                    >
                      Add this
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No suggestions yet.</h3>
                <p>Paste something and I'll turn it into task ideas.</p>
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
            <p>Keep it light. This is just enough to test the product properly.</p>
          </div>
        </header>

        <section className="panel panel--quiet">
          <h2>Privacy</h2>
          <p>Your tasks stay on this device. No account. No server. No tracking.</p>
        </section>

        <section className="panel panel--quiet">
          <h2>Home Screen test</h2>
          <p>Add What's Next to your iPhone Home Screen and use it for three days before deciding on native iOS.</p>
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
              Restore sample tasks
            </button>
            <button type="button" className="ghost-button danger-text" onClick={clearAll}>
              Reset data
            </button>
          </div>
        </section>

        <section className="panel panel--quiet">
          <h2>Version</h2>
          <p>PWA v0.1</p>
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
              title="Edit task"
              description="Keep it fast. Save the smallest useful change."
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

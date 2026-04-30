import { useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { NowCard } from './components/NowCard';
import { TaskCard } from './components/TaskCard';
import { TaskEditor } from './components/TaskEditor';
import { sampleTasks } from './data/sampleTasks';
import { extractTaskCandidates } from './lib/capture';
import { scoreTask, getNowRecommendation, sortTasksByRecommendation } from './lib/recommendation';
import { loadAppData, saveAppData } from './lib/storage';
import {
  applyFeedback,
  createLog,
  createTaskFromDraft,
  getPostponeWeight,
  normalizeTasksForToday
} from './lib/tasks';
import {
  formatDateLabel,
  formatTimeLabel,
  getDueLabel,
  getGreetingCopy,
  getTimeBand,
  getTimeBandLabel,
  plusMinutes,
  toDateKey
} from './lib/time';
import type {
  ActivityLog,
  AppView,
  CaptureCandidate,
  Task,
  TaskDraft,
  TaskFilter
} from './types';

const COMPLETE_MESSAGES = [
  '좋아요. 하나 끝냈습니다.',
  '작게라도 앞으로 갔어요.',
  '다음 할 일도 준비해둘게요.'
];

function getCompleteMessage(date: Date) {
  return COMPLETE_MESSAGES[date.getTime() % COMPLETE_MESSAGES.length];
}

function buildPatternSummary(tasks: Task[], logs: ActivityLog[]) {
  const postponed = tasks
    .filter((task) => getPostponeWeight(task) > 0)
    .sort((left, right) => getPostponeWeight(right) - getPostponeWeight(left));

  if (postponed.length === 0) {
    return '최근에는 크게 미루는 패턴이 보이지 않아요. 지금 흐름을 잘 유지하고 있습니다.';
  }

  const parts: string[] = [];
  const topTask = postponed[0];

  if (topTask.due === 'none') {
    parts.push('마감이 없는 일이 가장 자주 밀리고 있어요.');
  }

  if (getPostponeWeight(topTask) >= 3) {
    parts.push(`특히 "${topTask.title}" 같은 일이 반복해서 뒤로 밀렸습니다.`);
  }

  const delayLogs = logs.filter((log) =>
    ['snoozed', 'excludedToday', 'negativeFeedback'].includes(log.type)
  );
  const eveningDelayCount = delayLogs.filter((log) => {
    const hour = new Date(log.createdAt).getHours();
    return hour >= 18 || hour < 5;
  }).length;

  if (delayLogs.length > 0 && eveningDelayCount / delayLogs.length >= 0.5) {
    parts.push('저녁 이후에 미루는 선택이 더 많았습니다.');
  }

  return parts.slice(0, 2).join(' ') || '최근 미룸 기록을 기준으로 보면 짧고 마감 있는 일이 더 잘 처리됩니다.';
}

function getVisibleTasks(filter: TaskFilter, tasks: Task[], now: Date) {
  const ranked = sortTasksByRecommendation(tasks, now);

  if (filter === 'completed') {
    return ranked
      .filter((task) => task.status === 'completed')
      .sort((left, right) => {
        return (
          new Date(right.completedAt ?? right.createdAt).getTime() -
          new Date(left.completedAt ?? left.createdAt).getTime()
        );
      });
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
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const currentBand = getTimeBand(now);
  const greeting = getGreetingCopy(now);
  const recommendation = getNowRecommendation(tasks, now);
  const sortedTasks = sortTasksByRecommendation(tasks, now);
  const visibleTasks = getVisibleTasks(listFilter, tasks, now);
  const activeTasks = tasks.filter((task) => task.status === 'active');
  const remainingCount = activeTasks.length;
  const remainingMinutes = activeTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const postponedTasks = tasks
    .filter((task) => task.status === 'active' && getPostponeWeight(task) > 0)
    .sort((left, right) => getPostponeWeight(right) - getPostponeWeight(left));
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
  const recentCompleted = tasks
    .filter((task) => task.status === 'completed')
    .sort(
      (left, right) =>
        new Date(right.completedAt ?? right.createdAt).getTime() -
        new Date(left.completedAt ?? left.createdAt).getTime()
    )
    .slice(0, 5);
  const nextCandidates = sortedTasks
    .filter(
      (task) =>
        task.status === 'active' &&
        task.id !== recommendation.task?.id &&
        Number.isFinite(scoreTask(task, now).score)
    )
    .slice(0, 3);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function pushLog(type: ActivityLog['type'], when: Date, taskId?: string, meta?: string) {
    setLogs((current) => [createLog(type, when, taskId, meta), ...current].slice(0, 300));
  }

  function addTask(draft: TaskDraft, source: Task['source'] = 'manual') {
    const stamp = new Date();
    const task = createTaskFromDraft(draft, stamp, source);

    setTasks((current) => [task, ...current]);
    pushLog(source === 'capture' ? 'captured' : 'created', stamp, task.id);
    setActiveView('today');
    showToast('할 일을 저장했어요.');
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
    showToast('할 일을 수정했어요.');
  }

  function completeTask(taskId: string) {
    const stamp = new Date();
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'completed',
              completedAt: stamp.toISOString(),
              excludedToday: false,
              excludedOnDate: undefined,
              snoozeUntil: undefined
            }
          : task
      )
    );
    pushLog('completed', stamp, taskId);
    showToast(getCompleteMessage(stamp));
  }

  function deleteTask(taskId: string) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !window.confirm(`"${target.title}"를 삭제할까요?`)) {
      return;
    }

    const stamp = new Date();
    setTasks((current) => current.filter((task) => task.id !== taskId));
    pushLog('deleted', stamp, taskId);
    showToast('할 일을 삭제했어요.');
  }

  function snoozeTask(taskId: string) {
    const stamp = new Date();
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? applyFeedback(task, stamp, 'snooze', {
              snoozeCount: task.snoozeCount + 1,
              snoozeUntil: plusMinutes(stamp, 10).toISOString(),
              excludedToday: false,
              excludedOnDate: undefined
            })
          : task
      )
    );
    pushLog('snoozed', stamp, taskId);
    showToast('10분 뒤에 다시 보여드릴게요.');
  }

  function skipToday(taskId: string) {
    const stamp = new Date();
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? applyFeedback(task, stamp, 'skipToday', {
              excludedToday: true,
              excludedOnDate: toDateKey(stamp),
              snoozeUntil: undefined
            })
          : task
      )
    );
    pushLog('excludedToday', stamp, taskId);
    showToast('오늘 추천에서는 빼둘게요.');
  }

  function negativeFeedback(taskId: string) {
    const stamp = new Date();
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? applyFeedback(task, stamp, 'negative', {
              negativeFeedbackCount: task.negativeFeedbackCount + 1
            })
          : task
      )
    );
    pushLog('negativeFeedback', stamp, taskId);
    showToast('다른 후보를 우선 살펴볼게요.');
  }

  function restoreSamples() {
    if (!window.confirm('현재 데이터 대신 샘플 데이터로 다시 시작할까요?')) {
      return;
    }

    const stamp = new Date();
    setTasks(sampleTasks(stamp));
    setLogs([createLog('restoredSamples', stamp)]);
    setActiveView('today');
    showToast('샘플 데이터를 다시 불러왔어요.');
  }

  function clearAll() {
    if (!window.confirm('모든 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setTasks([]);
    setLogs([]);
    setCaptureCandidates([]);
    showToast('모든 데이터를 삭제했어요.');
  }

  function parseCaptureText() {
    const candidates = extractTaskCandidates(captureText);
    setCaptureCandidates(candidates);

    if (candidates.length === 0) {
      showToast('할 일 후보를 찾지 못했어요. 문장을 조금 더 잘게 붙여넣어 보세요.');
      return;
    }

    showToast(`${candidates.length}개의 후보를 만들었어요.`);
  }

  function saveCaptureCandidates() {
    const selected = captureCandidates.filter((candidate) => candidate.selected);
    if (selected.length === 0) {
      showToast('저장할 후보를 하나 이상 선택해 주세요.');
      return;
    }

    selected.forEach((candidate) => addTask(candidate, 'capture'));
    setCaptureText('');
    setCaptureCandidates([]);
    showToast(`${selected.length}개의 할 일을 저장했어요.`);
  }

  function renderTodayView() {
    return (
      <section className="view">
        <header className="hero-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">{formatDateLabel(now)}</div>
              <h1>{greeting.greeting}</h1>
              <p>{greeting.status}</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveView('history')}>
              기록
            </button>
          </div>
          <div className="hero-card__footer">
            <span>{formatTimeLabel(now)}</span>
            <span>{getTimeBandLabel(currentBand)} 흐름</span>
            <span>{greeting.tagline}</span>
          </div>
        </header>

        <NowCard
          task={recommendation.task}
          reasons={recommendation.reasons}
          onComplete={completeTask}
          onSnooze={snoozeTask}
          onSkipToday={skipToday}
          onNegative={negativeFeedback}
          onQuickAdd={() => setActiveView('add')}
        />

        <section className="summary-grid">
          <article className="summary-card">
            <div className="eyebrow">오늘 남은 일</div>
            <strong>{remainingCount}개</strong>
            <p>예상 {remainingMinutes}분 정도면 오늘 목록을 한 번 훑을 수 있어요.</p>
          </article>
          <article className="summary-card">
            <div className="eyebrow">미룬 일 요약</div>
            <strong>{postponedTasks.length}개</strong>
            <p>
              {postponedTasks.length > 0
                ? `"${postponedTasks[0].title}"이 가장 자주 밀렸어요.`
                : '아직 반복해서 미룬 일은 없습니다.'}
            </p>
          </article>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>이어지면 좋은 다음 후보</h2>
              <p>추천 점수가 높은 순서대로 정리했습니다.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveView('add')}>
              빠른 추가
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
                <h3>아직 할 일이 없어요.</h3>
                <p>하나만 추가해볼까요? 추천은 제가 바로 정리해둘게요.</p>
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
            <div className="eyebrow">10초 안에 추가</div>
            <h1>할 일 추가</h1>
            <p>제목만 적어도 저장됩니다. 나머지는 기본값으로 바로 추천에 반영합니다.</p>
          </div>
        </header>

        <TaskEditor
          title="빠르게 하나 넣어둘게요"
          description="입력하자마자 Today 화면으로 돌아갑니다."
          submitLabel="저장하고 오늘 화면으로"
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
            <div className="eyebrow">전체 관리</div>
            <h1>할 일 목록</h1>
            <p>전체, 오늘 할 일, 완료, 미룬 일 기준으로 바로 정리할 수 있어요.</p>
          </div>
        </header>

        <div className="filter-bar">
          {[
            ['all', '전체'],
            ['today', '오늘 할 일'],
            ['completed', '완료한 일'],
            ['postponed', '미룬 일']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${listFilter === value ? 'is-selected' : ''}`}
              onClick={() => setListFilter(value as TaskFilter)}
            >
              {label}
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
              <h3>표시할 할 일이 없어요.</h3>
              <p>필터를 바꾸거나 새 할 일을 하나 추가해보세요.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCaptureView() {
    const preferredTimeLabel = {
      morning: '아침',
      afternoon: '오후',
      evening: '저녁',
      anytime: '상관없음'
    } as const;

    return (
      <section className="view">
        <header className="screen-header">
          <div>
            <div className="eyebrow">복붙해서 정리</div>
            <h1>캡처</h1>
            <p>카카오톡, 메일, 메모 문장을 붙여넣으면 할 일 후보로 바꿔드립니다.</p>
          </div>
        </header>

        <section className="panel">
          <label className="field">
            <span>붙여넣을 텍스트</span>
            <textarea
              rows={6}
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="예: 내일까지 보고서 초안 보내주세요. 오후에 회의자료도 확인 부탁드립니다."
            />
          </label>
          <button type="button" className="primary-button" onClick={parseCaptureText}>
            후보 추출하기
          </button>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>추출된 후보</h2>
              <p>필요한 것만 골라서 바로 저장할 수 있습니다.</p>
            </div>
            <button type="button" className="secondary-button" onClick={saveCaptureCandidates}>
              선택한 후보 저장
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
                      <span>저장하기</span>
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
                      <span>{candidate.durationMinutes}분</span>
                      <span>{getDueLabel(candidate.due)}</span>
                      <span>{preferredTimeLabel[candidate.preferredTime]}</span>
                    </div>
                    <p className="task-card__memo">{candidate.rawText}</p>
                  </div>
                  <div className="task-card__actions">
                    <button
                      type="button"
                      className="tiny-button primary"
                      onClick={() => {
                        addTask(candidate, 'capture');
                        setCaptureCandidates((current) =>
                          current.filter((item) => item.id !== candidate.id)
                        );
                      }}
                    >
                      바로 저장
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>아직 후보가 없습니다.</h3>
                <p>문장을 붙여넣고 추출 버튼을 누르면 후보가 여기 나타납니다.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderHistoryView() {
    return (
      <section className="view">
        <header className="screen-header">
            <div>
              <div className="eyebrow">완료와 미룸 흐름</div>
              <h1>기록</h1>
              <p>오늘 끝낸 일과 자주 미루는 패턴을 한눈에 정리했습니다.</p>
            </div>
          <button type="button" className="ghost-button" onClick={() => setActiveView('today')}>
            돌아가기
          </button>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <div className="eyebrow">오늘 완료</div>
            <strong>{completedToday.length}개</strong>
            <p>
              {completedToday.length > 0
                ? completedToday[0].title
                : '아직 오늘 완료한 일이 없습니다.'}
            </p>
          </article>
          <article className="summary-card">
            <div className="eyebrow">자주 미룬 일</div>
            <strong>{postponedTasks.length}개</strong>
            <p>{buildPatternSummary(tasks, logs)}</p>
          </article>
        </section>

        <section className="panel">
          <h2>오늘 완료한 일</h2>
          <div className="stack">
            {completedToday.length > 0 ? (
              completedToday.map((task) => <TaskCard key={task.id} task={task} showStatus onDelete={deleteTask} />)
            ) : (
              <div className="empty-state">
                <h3>아직 비어 있어요.</h3>
                <p>Today 화면에서 완료를 누르면 여기 쌓입니다.</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>최근 완료한 일</h2>
          <div className="stack">
            {recentCompleted.length > 0 ? (
              recentCompleted.map((task) => <TaskCard key={task.id} task={task} showStatus onDelete={deleteTask} />)
            ) : (
              <div className="empty-state">
                <h3>아직 완료 기록이 없습니다.</h3>
                <p>하나 끝내면 이력이 바로 남습니다.</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>자주 미룬 일</h2>
          <div className="stack">
            {postponedTasks.length > 0 ? (
              postponedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showStatus
                  onComplete={completeTask}
                  onEdit={setEditingTask}
                  onDelete={deleteTask}
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>반복해서 미룬 일은 아직 없어요.</h3>
                <p>기록이 쌓이면 미루는 패턴도 요약해드릴게요.</p>
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
            <div className="eyebrow">앱 정보</div>
            <h1>설정</h1>
            <p>복잡한 설정 대신 필요한 안내와 데이터 관리만 담았습니다.</p>
          </div>
        </header>

        <section className="panel">
          <h2>What&apos;s Next / 오늘하나</h2>
          <p>
            지금 뭐부터 해야 할지 고민하는 시간을 줄이고, 지금 할 일 하나를 또렷하게 추천하는
            모바일 우선 하루 비서 앱입니다.
          </p>
        </section>

        <section className="panel">
          <h2>개인정보 안내</h2>
          <p>모든 데이터는 현재 기기 브라우저에만 저장됩니다. 로그인도, 외부 서버도 사용하지 않습니다.</p>
        </section>

        <section className="panel">
          <h2>데이터 관리</h2>
          <div className="stack">
            <button type="button" className="secondary-button" onClick={restoreSamples}>
              샘플 데이터 다시 불러오기
            </button>
            <button type="button" className="ghost-button danger-text" onClick={clearAll}>
              전체 데이터 삭제
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>버전</h2>
          <p>v0.1</p>
        </section>

        <section className="panel">
          <h2>다음 단계 예정</h2>
          <ul className="plain-list">
            <li>캘린더 연동</li>
            <li>홈 화면 위젯</li>
            <li>푸시 알림</li>
            <li>iOS 앱 출시</li>
            <li>AI 추천 고도화</li>
          </ul>
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
      case 'history':
        return renderHistoryView();
      case 'settings':
        return renderSettingsView();
    }
  }

  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--one" />
      <div className="app-shell__glow app-shell__glow--two" />

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
              title="할 일 수정"
              description="지금 흐름에 맞게 빠르게 손볼 수 있어요."
              submitLabel="수정 저장"
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

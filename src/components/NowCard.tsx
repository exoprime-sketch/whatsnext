import type { Task } from '../types';
import { getDueLabel } from '../lib/time';

interface NowCardProps {
  task: Task | null;
  reasons: string[];
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onSkipToday: (taskId: string) => void;
  onNegative: (taskId: string) => void;
  onQuickAdd: () => void;
}

export function NowCard({
  task,
  reasons,
  onComplete,
  onSnooze,
  onSkipToday,
  onNegative,
  onQuickAdd
}: NowCardProps) {
  if (!task) {
    return (
      <section className="now-card empty">
        <div className="eyebrow">지금은 비어 있어요</div>
        <h2>지금 추천할 일이 없습니다.</h2>
        <p>오늘 할 일을 하나 추가해보세요. 바로 지금 할 일 하나로 정리해둘게요.</p>
        <button type="button" className="primary-button" onClick={onQuickAdd}>
          할 일 추가하기
        </button>
      </section>
    );
  }

  return (
    <section className="now-card">
      <div className="eyebrow">지금은 이것부터</div>
      <h2>{task.title}</h2>
      <div className="now-card__meta">
        <span>{task.durationMinutes}분</span>
        <span>{getDueLabel(task.due)}</span>
      </div>
      {task.memo ? <p className="now-card__memo">{task.memo}</p> : null}
      <div className="reason-list">
        {reasons.map((reason) => (
          <div key={reason} className="reason-pill">
            {reason}
          </div>
        ))}
      </div>
      <div className="now-card__actions">
        <button type="button" className="primary-button" onClick={() => onComplete(task.id)}>
          완료
        </button>
        <button type="button" className="secondary-button" onClick={() => onSnooze(task.id)}>
          10분 뒤
        </button>
        <button type="button" className="ghost-button" onClick={() => onSkipToday(task.id)}>
          오늘 말고
        </button>
        <button type="button" className="ghost-button" onClick={() => onNegative(task.id)}>
          별로예요
        </button>
      </div>
    </section>
  );
}

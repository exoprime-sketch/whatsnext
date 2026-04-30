import type { Task } from '../types';
import { getDueLabel } from '../lib/time';

const IMPORTANCE_LABEL = {
  high: '높음',
  medium: '보통',
  low: '낮음'
} as const;

const TIME_LABEL = {
  morning: '아침',
  afternoon: '오후',
  evening: '저녁',
  anytime: '상관없음'
} as const;

interface TaskCardProps {
  task: Task;
  showStatus?: boolean;
  onComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({
  task,
  showStatus = false,
  onComplete,
  onEdit,
  onDelete
}: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card__body">
        <div className="task-card__header">
          <h3>{task.title}</h3>
          {showStatus ? (
            <span className={`status-pill ${task.status === 'completed' ? 'is-done' : ''}`}>
              {task.status === 'completed' ? '완료' : '진행 중'}
            </span>
          ) : null}
        </div>
        <div className="meta-row">
          <span>{task.durationMinutes}분</span>
          <span>{IMPORTANCE_LABEL[task.importance]}</span>
          <span>{getDueLabel(task.due)}</span>
          <span>{TIME_LABEL[task.preferredTime]}</span>
        </div>
        {task.memo ? <p className="task-card__memo">{task.memo}</p> : null}
        {task.snoozeCount > 0 || task.negativeFeedbackCount > 0 ? (
          <p className="task-card__insight">
            미룸 {task.snoozeCount}회 · 별로예요 {task.negativeFeedbackCount}회
          </p>
        ) : null}
      </div>
      <div className="task-card__actions">
        {task.status === 'active' && onComplete ? (
          <button type="button" className="tiny-button primary" onClick={() => onComplete(task.id)}>
            완료
          </button>
        ) : null}
        {onEdit ? (
          <button type="button" className="tiny-button" onClick={() => onEdit(task)}>
            수정
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" className="tiny-button danger" onClick={() => onDelete(task.id)}>
            삭제
          </button>
        ) : null}
      </div>
    </article>
  );
}

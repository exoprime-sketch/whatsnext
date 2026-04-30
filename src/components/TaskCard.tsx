import type { Task } from '../types';
import { getDueLabel } from '../lib/time';

const IMPORTANCE_LABEL = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority'
} as const;

const TIME_LABEL = {
  morning: 'Best in the morning',
  afternoon: 'Best in the afternoon',
  evening: 'Best in the evening',
  anytime: 'Any time'
} as const;

const TYPE_LABEL = {
  task: 'Task',
  event: 'Event',
  reminder: 'Reminder'
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
  const metaItems = [TYPE_LABEL[task.itemType], `${task.durationMinutes} min`];

  if (task.due !== 'none') {
    metaItems.push(getDueLabel(task.due));
  }

  if (task.importance !== 'low') {
    metaItems.push(IMPORTANCE_LABEL[task.importance]);
  }

  if (task.preferredTime !== 'anytime') {
    metaItems.push(TIME_LABEL[task.preferredTime]);
  }

  if (task.dateLabel) {
    metaItems.push(task.dateLabel);
  }

  if (task.timeLabel) {
    metaItems.push(task.timeLabel);
  }

  if (task.personLabel) {
    metaItems.push(task.personLabel);
  }

  if (task.locationLabel) {
    metaItems.push(task.locationLabel);
  }

  const delayedCount = task.snoozeCount + task.negativeFeedbackCount;

  return (
    <article className="task-card">
      <div className="task-card__body">
        <div className="task-card__header">
          <div className="stack stack--tight">
            <div className="task-badge-row">
              <span className={`type-pill type-pill--${task.itemType}`}>{TYPE_LABEL[task.itemType]}</span>
              {task.source === 'capture' ? <span className="status-pill">Captured</span> : null}
              {showStatus ? (
                <span className={`status-pill ${task.status === 'completed' ? 'is-done' : ''}`}>
                  {task.status === 'completed' ? 'Done' : 'Waiting'}
                </span>
              ) : null}
            </div>
            <h3>{task.title}</h3>
          </div>
        </div>
        <div className="meta-row">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {task.memo ? <p className="task-card__memo">{task.memo}</p> : null}
        {delayedCount > 0 ? (
          <p className="task-card__insight">
            Delayed {delayedCount} {delayedCount === 1 ? 'time' : 'times'}
          </p>
        ) : null}
      </div>
      <div className="task-card__actions">
        {task.status === 'active' && onComplete ? (
          <button type="button" className="tiny-button primary" onClick={() => onComplete(task.id)}>
            Done
          </button>
        ) : null}
        {onEdit ? (
          <button type="button" className="tiny-button" onClick={() => onEdit(task)}>
            Edit
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" className="tiny-button danger" onClick={() => onDelete(task.id)}>
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}

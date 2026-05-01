import { EventExportPanel } from './EventExportPanel';
import { formatParsedDate, formatParsedTime, getDueLabel } from '../lib/time';
import type { Task } from '../types';

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
  onDownloadICS?: (task: Task) => void;
  onCopyDetails?: (task: Task) => void;
}

export function TaskCard({
  task,
  showStatus = false,
  onComplete,
  onEdit,
  onDelete,
  onDownloadICS,
  onCopyDetails
}: TaskCardProps) {
  const metaItems: string[] = [];

  if (task.due !== 'none') {
    metaItems.push(getDueLabel(task.due));
  }

  if (task.parsedDate) {
    metaItems.push(formatParsedDate(task.parsedDate));
  } else if (task.dateText) {
    metaItems.push(task.dateText);
  }

  if (task.parsedTime) {
    metaItems.push(formatParsedTime(task.parsedTime));
  } else if (task.timeText) {
    metaItems.push(task.timeText);
  }

  if (task.personText) {
    metaItems.push(task.personText);
  }

  if (task.locationText) {
    metaItems.push(task.locationText);
  }

  const reviewLabel = task.needsDateReview ? 'Needs date' : task.needsTimeReview ? 'Needs time' : null;
  const showExportPanel = Boolean(onCopyDetails && onDownloadICS);

  return (
    <article className="task-card">
      <div className="task-card__body">
        <div className="task-card__header">
          <div className="stack stack--tight">
            <div className="task-badge-row">
              <span className={`type-pill type-pill--${task.itemType}`}>{TYPE_LABEL[task.itemType]}</span>
              {task.calendarReady ? <span className="status-pill status-pill--ready">Calendar-ready</span> : null}
              {reviewLabel ? <span className="status-pill">{reviewLabel}</span> : null}
              {showStatus ? (
                <span className={`status-pill ${task.status === 'completed' ? 'is-done' : ''}`}>
                  {task.status === 'completed' ? 'Done' : 'Waiting'}
                </span>
              ) : null}
            </div>
            <h3>{task.title}</h3>
          </div>
        </div>
        {metaItems.length > 0 ? (
          <div className="meta-row">
            {metaItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        {task.memo ? <p className="task-card__memo">{task.memo}</p> : null}
        {task.alarmLabel && task.alarmEnabled ? <p className="task-card__insight">Alarm: {task.alarmLabel}</p> : null}
        {showExportPanel ? (
          <EventExportPanel
            item={task}
            onDownload={() => onDownloadICS?.(task)}
            onCopy={() => onCopyDetails?.(task)}
          />
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

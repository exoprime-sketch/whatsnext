import { formatParsedDate, formatParsedTime, getDueLabel } from '../lib/time';
import type { Task } from '../types';

const TYPE_LABEL = {
  task: 'Task',
  event: 'Event',
  reminder: 'Reminder'
} as const;

interface NowCardProps {
  task: Task | null;
  reasons: string[];
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onSkipToday: (taskId: string) => void;
  onOpenCapture: () => void;
  onManualAdd: () => void;
}

export function NowCard({
  task,
  reasons,
  onComplete,
  onSnooze,
  onSkipToday,
  onOpenCapture,
  onManualAdd
}: NowCardProps) {
  if (!task) {
    return (
      <section className="now-card empty">
        <div className="eyebrow">Now</div>
        <h2>Nothing urgent right now.</h2>
        <p>Paste a message. We&apos;ll find the follow-ups.</p>
        <div className="empty-actions">
          <button type="button" className="primary-button" onClick={onOpenCapture}>
            Capture
          </button>
          <button type="button" className="ghost-button" onClick={onManualAdd}>
            Add manually
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="now-card">
      <div className="eyebrow">Now</div>
      <h2>{task.title}</h2>
      {reasons[0] ? <p className="now-card__lead">{reasons[0]}</p> : null}
      <div className="now-card__meta">
        <span>{TYPE_LABEL[task.itemType]}</span>
        {task.due !== 'none' ? <span>{getDueLabel(task.due)}</span> : null}
        {task.parsedDate ? <span>{formatParsedDate(task.parsedDate)}</span> : task.dateText ? <span>{task.dateText}</span> : null}
        {task.parsedTime ? <span>{formatParsedTime(task.parsedTime)}</span> : task.timeText ? <span>{task.timeText}</span> : null}
        {task.needsDateReview ? <span>Needs date</span> : null}
        {task.needsTimeReview ? <span>Needs time</span> : null}
      </div>
      {task.memo ? <p className="now-card__memo">{task.memo}</p> : null}
      {reasons.length > 1 ? (
        <div className="reason-list">
          {reasons.slice(1).map((reason) => (
            <div key={reason} className="reason-pill">
              {reason}
            </div>
          ))}
        </div>
      ) : null}
      <div className="now-card__actions now-card__actions--three">
        <button type="button" className="primary-button" onClick={() => onComplete(task.id)}>
          Done
        </button>
        <button type="button" className="secondary-button" onClick={() => onSnooze(task.id)}>
          Later
        </button>
        <button type="button" className="ghost-button" onClick={() => onSkipToday(task.id)}>
          Not today
        </button>
      </div>
    </section>
  );
}

import type { Task } from '../types';
import { getDueLabel } from '../lib/time';

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
        <h2>Nothing needs follow-up yet.</h2>
        <p>Start in Capture. Paste something messy first, then come back here for the next move.</p>
        <div className="empty-actions">
          <button type="button" className="primary-button" onClick={onOpenCapture}>
            Go to Capture
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
        <span>{task.durationMinutes} min</span>
        {task.due !== 'none' ? <span>{getDueLabel(task.due)}</span> : null}
        {task.timeLabel ? <span>{task.timeLabel}</span> : null}
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
      <p className="subcopy">Capture is the front door. This card is the follow-through layer.</p>
    </section>
  );
}

import type { Task } from '../types';
import { getDueLabel } from '../lib/time';

interface NowCardProps {
  task: Task | null;
  reasons: string[];
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onSkipToday: (taskId: string) => void;
  onQuickAdd: () => void;
}

export function NowCard({
  task,
  reasons,
  onComplete,
  onSnooze,
  onSkipToday,
  onQuickAdd
}: NowCardProps) {
  if (!task) {
    return (
      <section className="now-card empty">
        <div className="eyebrow">Now</div>
        <h2>Nothing to decide right now.</h2>
        <p>Add one task and I'll pick what to do next. Start with one thing.</p>
        <button type="button" className="primary-button" onClick={onQuickAdd}>
          Add a task
        </button>
      </section>
    );
  }

  return (
    <section className="now-card">
      <div className="eyebrow">Now</div>
      <h2>{task.title}</h2>
      {reasons[0] ? <p className="now-card__lead">{reasons[0]}</p> : null}
      <div className="now-card__meta">
        <span>{task.durationMinutes} min</span>
        {task.due !== 'none' ? <span>{getDueLabel(task.due)}</span> : null}
        {task.importance === 'high' ? <span>High priority</span> : null}
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
      <p className="subcopy">Finish this and I'll keep the next one ready.</p>
    </section>
  );
}

import { canExportICS } from '../lib/calendarExport';
import { isCalendarRelevantItem } from '../lib/tasks';
import type { TaskDraft } from '../types';

interface EventExportPanelProps {
  item: Pick<
    TaskDraft,
    | 'title'
    | 'memo'
    | 'durationMinutes'
    | 'itemType'
    | 'parsedDate'
    | 'parsedDateTime'
    | 'dateText'
    | 'needsDateReview'
    | 'needsTimeReview'
    | 'alarmLabel'
    | 'calendarReady'
  >;
  onDownload: () => void;
  onCopy: () => void;
}

export function EventExportPanel({ item, onDownload, onCopy }: EventExportPanelProps) {
  if (!isCalendarRelevantItem(item)) {
    return null;
  }

  const exportReady = canExportICS(item);
  const reviewLabel = item.needsDateReview ? 'Needs date' : item.needsTimeReview ? 'Needs time' : 'Calendar-ready';

  return (
    <section className="export-panel">
      <div className="task-badge-row">
        <span className={`status-pill ${exportReady ? 'status-pill--ready' : ''}`}>{reviewLabel}</span>
        {item.alarmLabel ? <span className="status-pill">Alarm: {item.alarmLabel}</span> : null}
      </div>
      <div className="qa-actions">
        {exportReady ? (
          <button type="button" className="secondary-button" onClick={onDownload}>
            Download calendar file
          </button>
        ) : null}
        <button type="button" className="ghost-button" onClick={onCopy}>
          Copy event details
        </button>
      </div>
      <p className="subcopy">
        {exportReady
          ? 'Add this to your calendar. Native calendar save comes later.'
          : 'Add to calendar manually for now. Native calendar save comes later.'}
      </p>
    </section>
  );
}

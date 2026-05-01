import { AlarmSelector } from './AlarmSelector';
import { EventExportPanel } from './EventExportPanel';
import { supportsAlarmSelection } from '../lib/tasks';
import type { CaptureCandidate, ItemType } from '../types';

const TYPE_LABEL: Record<ItemType, string> = {
  task: 'Task',
  event: 'Event',
  reminder: 'Reminder'
};

interface CaptureCandidateCardProps {
  candidate: CaptureCandidate;
  onToggleSelected: (candidateId: string, selected: boolean) => void;
  onChange: (candidateId: string, updates: Partial<CaptureCandidate>) => void;
  onAlarmChange: (candidateId: string, alarmEnabled: boolean, alarmBeforeMinutes: number | null) => void;
  onPreviewDownload: (candidate: CaptureCandidate) => void;
  onPreviewCopy: (candidate: CaptureCandidate) => void;
}

export function CaptureCandidateCard({
  candidate,
  onToggleSelected,
  onChange,
  onAlarmChange,
  onPreviewDownload,
  onPreviewCopy
}: CaptureCandidateCardProps) {
  const chips = [candidate.personText, candidate.locationText].filter((item): item is string => Boolean(item));
  const needsReviewLabel = candidate.needsDateReview ? 'Needs date' : candidate.needsTimeReview ? 'Needs time' : null;
  const calendarLabel = candidate.calendarReady ? 'Calendar-ready' : 'Add to calendar manually';
  const showPeopleFields = candidate.itemType !== 'task' || Boolean(candidate.personText || candidate.locationText);

  return (
    <article className={`task-card capture-card ${candidate.selected ? '' : 'is-unselected'}`}>
      <div className="task-card__body">
        <div className="task-card__header">
          <label className="candidate-toggle">
            <input
              type="checkbox"
              checked={candidate.selected}
              onChange={(event) => onToggleSelected(candidate.id, event.target.checked)}
            />
            <span>Select</span>
          </label>
          <div className="task-badge-row">
            <span className={`type-pill type-pill--${candidate.itemType}`}>{TYPE_LABEL[candidate.itemType]}</span>
            {needsReviewLabel ? <span className="status-pill">{needsReviewLabel}</span> : null}
          </div>
        </div>

        <label className="field field--tight">
          <span>Title</span>
          <input value={candidate.title} onChange={(event) => onChange(candidate.id, { title: event.target.value })} />
        </label>

        <div className="form-grid">
          <label className="field field--tight">
            <span>Date</span>
            <input
              value={candidate.dateText ?? ''}
              onChange={(event) => onChange(candidate.id, { dateText: event.target.value })}
              placeholder="Tomorrow or next Tuesday"
            />
          </label>
          <label className="field field--tight">
            <span>Time</span>
            <input
              value={candidate.timeText ?? ''}
              onChange={(event) => onChange(candidate.id, { timeText: event.target.value })}
              placeholder="3 PM or before dinner"
            />
          </label>
        </div>

        {showPeopleFields ? (
          <div className="form-grid">
            <label className="field field--tight">
              <span>With</span>
              <input
                value={candidate.personText ?? ''}
                onChange={(event) => onChange(candidate.id, { personText: event.target.value })}
                placeholder="Person or team"
              />
            </label>
            <label className="field field--tight">
              <span>Where</span>
              <input
                value={candidate.locationText ?? ''}
                onChange={(event) => onChange(candidate.id, { locationText: event.target.value })}
                placeholder="Zoom, cafe, office"
              />
            </label>
          </div>
        ) : null}

        {chips.length > 0 ? (
          <div className="meta-row">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        ) : null}

        <div className="task-badge-row">
          <span className={`status-pill ${candidate.calendarReady ? 'status-pill--ready' : ''}`}>{calendarLabel}</span>
        </div>

        {supportsAlarmSelection(candidate) ? (
          <AlarmSelector
            alarmEnabled={candidate.alarmEnabled}
            alarmBeforeMinutes={candidate.alarmBeforeMinutes}
            alarmNeedsReview={candidate.alarmNeedsReview}
            canSelectTimedAlarm={Boolean(candidate.parsedDateTime)}
            onChange={(alarmEnabled, alarmBeforeMinutes) =>
              onAlarmChange(candidate.id, alarmEnabled, alarmBeforeMinutes)
            }
          />
        ) : null}

        <EventExportPanel
          item={candidate}
          onDownload={() => onPreviewDownload(candidate)}
          onCopy={() => onPreviewCopy(candidate)}
        />

        <details className="capture-source">
          <summary>Original text</summary>
          <p className="task-card__memo">{candidate.originalText}</p>
        </details>
      </div>
    </article>
  );
}

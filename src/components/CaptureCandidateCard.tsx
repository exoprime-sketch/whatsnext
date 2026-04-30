import type { CaptureCandidate, ItemType } from '../types';

const TYPE_LABEL: Record<ItemType, string> = {
  task: 'Task',
  event: 'Event',
  reminder: 'Reminder'
};

function getConfidenceLabel(confidence: number) {
  if (confidence >= 0.8) {
    return 'High confidence';
  }

  if (confidence >= 0.65) {
    return 'Medium confidence';
  }

  return 'Low confidence';
}

interface CaptureCandidateCardProps {
  candidate: CaptureCandidate;
  onToggleSelected: (candidateId: string, selected: boolean) => void;
  onChange: (candidateId: string, updates: Partial<CaptureCandidate>) => void;
}

export function CaptureCandidateCard({
  candidate,
  onToggleSelected,
  onChange
}: CaptureCandidateCardProps) {
  const chips = [candidate.dateLabel, candidate.timeLabel, candidate.personLabel, candidate.locationLabel].filter(
    (item): item is string => Boolean(item)
  );

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
            <span className="status-pill">{getConfidenceLabel(candidate.confidence)}</span>
          </div>
        </div>

        <label className="field field--tight">
          <span>Title</span>
          <input
            className="candidate-input"
            value={candidate.title}
            onChange={(event) => onChange(candidate.id, { title: event.target.value })}
          />
        </label>

        <label className="field field--tight">
          <span>Note</span>
          <textarea
            rows={2}
            value={candidate.memo}
            onChange={(event) => onChange(candidate.id, { memo: event.target.value })}
            placeholder="Optional context"
          />
        </label>

        {chips.length > 0 ? (
          <div className="meta-row">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        ) : null}

        <p className="task-card__memo">{candidate.rawText}</p>
      </div>
    </article>
  );
}

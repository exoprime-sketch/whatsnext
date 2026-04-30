import { useEffect, useState } from 'react';
import { AlarmSelector } from './AlarmSelector';
import type { ItemType, TaskDraft } from '../types';
import { applyDraftScheduling, DEFAULT_TASK_DRAFT, supportsAlarmSelection, updateAlarmPreference } from '../lib/tasks';

const DURATION_OPTIONS: TaskDraft['durationMinutes'][] = [5, 10, 15, 30, 60];
const IMPORTANCE_OPTIONS: Array<{ value: TaskDraft['importance']; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];
const DUE_OPTIONS: Array<{ value: TaskDraft['due']; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'none', label: 'No due date' }
];
const TIME_OPTIONS: Array<{ value: TaskDraft['preferredTime']; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Any time' }
];
const TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: 'task', label: 'Task' },
  { value: 'event', label: 'Event' },
  { value: 'reminder', label: 'Reminder' }
];

interface TaskEditorProps {
  initialValue?: TaskDraft;
  submitLabel: string;
  title: string;
  description: string;
  onSubmit: (draft: TaskDraft) => void;
  onCancel?: () => void;
}

function ChipGroup<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="chip-group">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`chip ${value === option.value ? 'is-selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TaskEditor({
  initialValue,
  submitLabel,
  title,
  description,
  onSubmit,
  onCancel
}: TaskEditorProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => applyDraftScheduling(initialValue ?? DEFAULT_TASK_DRAFT, new Date()));

  function patchDraft(updates: Partial<TaskDraft>) {
    setDraft((current) => applyDraftScheduling({ ...current, ...updates }, new Date()));
  }

  useEffect(() => {
    setDraft(applyDraftScheduling(initialValue ?? DEFAULT_TASK_DRAFT, new Date()));
  }, [initialValue]);

  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.title.trim()) {
          return;
        }

        onSubmit(
          applyDraftScheduling(
            {
              ...draft,
              title: draft.title.trim(),
              memo: draft.memo.trim()
            },
            new Date()
          )
        );
      }}
    >
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {onCancel ? (
          <button type="button" className="ghost-button" onClick={onCancel}>
            Back
          </button>
        ) : null}
      </div>

      <div className="field">
        <span>Type</span>
        <ChipGroup value={draft.itemType} options={TYPE_OPTIONS} onChange={(value) => patchDraft({ itemType: value as ItemType })} />
      </div>

      <label className="field">
        <span>Title</span>
        <input
          autoFocus
          value={draft.title}
          onChange={(event) => patchDraft({ title: event.target.value })}
          placeholder="Reply to one important message"
        />
      </label>

      <label className="field">
        <span>Notes (optional)</span>
        <textarea
          rows={3}
          value={draft.memo}
          onChange={(event) => patchDraft({ memo: event.target.value })}
          placeholder="Use this only when a little context helps."
        />
      </label>

      <div className="form-grid">
        <label className="field field--tight">
          <span>Date</span>
          <input
            value={draft.dateText ?? ''}
            onChange={(event) => patchDraft({ dateText: event.target.value })}
            placeholder="Tomorrow or next Tuesday"
          />
        </label>
        <label className="field field--tight">
          <span>Time</span>
          <input
            value={draft.timeText ?? ''}
            onChange={(event) => patchDraft({ timeText: event.target.value })}
            placeholder="3 PM or before dinner"
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field field--tight">
          <span>With</span>
          <input
            value={draft.personText ?? ''}
            onChange={(event) => patchDraft({ personText: event.target.value })}
            placeholder="Person or team"
          />
        </label>
        <label className="field field--tight">
          <span>Where</span>
          <input
            value={draft.locationText ?? ''}
            onChange={(event) => patchDraft({ locationText: event.target.value })}
            placeholder="Zoom, cafe, office"
          />
        </label>
      </div>

      <div className="field">
        <span>Time</span>
        <ChipGroup
          value={draft.durationMinutes}
          options={DURATION_OPTIONS.map((option) => ({ value: option, label: `${option} min` }))}
          onChange={(value) => patchDraft({ durationMinutes: value as TaskDraft['durationMinutes'] })}
        />
      </div>

      <div className="field">
        <span>Importance</span>
        <ChipGroup
          value={draft.importance}
          options={IMPORTANCE_OPTIONS}
          onChange={(value) => patchDraft({ importance: value as TaskDraft['importance'] })}
        />
      </div>

      <div className="field">
        <span>Due</span>
        <ChipGroup
          value={draft.due}
          options={DUE_OPTIONS}
          onChange={(value) => patchDraft({ due: value as TaskDraft['due'] })}
        />
      </div>

      <div className="field">
        <span>Best time</span>
        <ChipGroup
          value={draft.preferredTime}
          options={TIME_OPTIONS}
          onChange={(value) => patchDraft({ preferredTime: value as TaskDraft['preferredTime'] })}
        />
      </div>

      {supportsAlarmSelection(draft) ? (
        <AlarmSelector
          alarmEnabled={draft.alarmEnabled}
          alarmBeforeMinutes={draft.alarmBeforeMinutes}
          alarmNeedsReview={draft.alarmNeedsReview}
          canSelectTimedAlarm={Boolean(draft.parsedDateTime)}
          onChange={(alarmEnabled, alarmBeforeMinutes) =>
            setDraft((current) => updateAlarmPreference(current, alarmEnabled, alarmBeforeMinutes))
          }
        />
      ) : null}

      <button type="submit" className="primary-button" disabled={!draft.title.trim()}>
        {submitLabel}
      </button>
      <p className="subcopy">Use manual add only when there is nothing useful to capture.</p>
    </form>
  );
}

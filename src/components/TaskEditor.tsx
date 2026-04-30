import { useEffect, useState } from 'react';
import type { TaskDraft } from '../types';
import { DEFAULT_TASK_DRAFT } from '../lib/tasks';

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
  const [draft, setDraft] = useState<TaskDraft>(initialValue ?? DEFAULT_TASK_DRAFT);

  useEffect(() => {
    setDraft(initialValue ?? DEFAULT_TASK_DRAFT);
  }, [initialValue]);

  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.title.trim()) {
          return;
        }

        onSubmit({
          ...draft,
          title: draft.title.trim(),
          memo: draft.memo.trim()
        });
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

      <label className="field">
        <span>Task</span>
        <input
          autoFocus
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="Reply to one important message"
        />
      </label>

      <label className="field">
        <span>Notes (optional)</span>
        <textarea
          rows={3}
          value={draft.memo}
          onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))}
          placeholder="Use this only when a little context helps."
        />
      </label>

      <div className="field">
        <span>Time</span>
        <ChipGroup
          value={draft.durationMinutes}
          options={DURATION_OPTIONS.map((option) => ({ value: option, label: `${option} min` }))}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              durationMinutes: value as TaskDraft['durationMinutes']
            }))
          }
        />
      </div>

      <div className="field">
        <span>Importance</span>
        <ChipGroup
          value={draft.importance}
          options={IMPORTANCE_OPTIONS}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              importance: value as TaskDraft['importance']
            }))
          }
        />
      </div>

      <div className="field">
        <span>Due</span>
        <ChipGroup
          value={draft.due}
          options={DUE_OPTIONS}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              due: value as TaskDraft['due']
            }))
          }
        />
      </div>

      <div className="field">
        <span>Best time</span>
        <ChipGroup
          value={draft.preferredTime}
          options={TIME_OPTIONS}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              preferredTime: value as TaskDraft['preferredTime']
            }))
          }
        />
      </div>

      <button type="submit" className="primary-button" disabled={!draft.title.trim()}>
        {submitLabel}
      </button>
      <p className="subcopy">Use manual add only when there is nothing useful to capture.</p>
    </form>
  );
}

import { useEffect, useState } from 'react';
import type { TaskDraft } from '../types';
import { DEFAULT_TASK_DRAFT } from '../lib/tasks';

const DURATION_OPTIONS: TaskDraft['durationMinutes'][] = [5, 10, 15, 30, 60];
const IMPORTANCE_OPTIONS: Array<{ value: TaskDraft['importance']; label: string }> = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' }
];
const DUE_OPTIONS: Array<{ value: TaskDraft['due']; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: 'tomorrow', label: '내일' },
  { value: 'thisWeek', label: '이번 주' },
  { value: 'none', label: '없음' }
];
const TIME_OPTIONS: Array<{ value: TaskDraft['preferredTime']; label: string }> = [
  { value: 'morning', label: '아침' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
  { value: 'anytime', label: '상관없음' }
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
            닫기
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>할 일 제목</span>
        <input
          autoFocus
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="예: 팀장님께 회의자료 보내기"
        />
      </label>

      <label className="field">
        <span>메모</span>
        <textarea
          rows={3}
          value={draft.memo}
          onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))}
          placeholder="선택 사항"
        />
      </label>

      <div className="field">
        <span>예상 소요시간</span>
        <ChipGroup
          value={draft.durationMinutes}
          options={DURATION_OPTIONS.map((option) => ({ value: option, label: `${option}분` }))}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              durationMinutes: value as TaskDraft['durationMinutes']
            }))
          }
        />
      </div>

      <div className="field">
        <span>중요도</span>
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
        <span>마감</span>
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
        <span>선호 시간대</span>
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
      <p className="subcopy">제목만 입력해도 바로 저장됩니다. 나머지는 기본값으로 채워둘게요.</p>
    </form>
  );
}

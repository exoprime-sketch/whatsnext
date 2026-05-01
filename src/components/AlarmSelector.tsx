import { getAlarmLabel } from '../lib/tasks';

const OPTIONS = [
  { label: 'No alarm', enabled: false, beforeMinutes: null as number | null },
  { label: 'At time', enabled: true, beforeMinutes: 0 },
  { label: '10 minutes before', enabled: true, beforeMinutes: 10 },
  { label: '30 minutes before', enabled: true, beforeMinutes: 30 },
  { label: '1 hour before', enabled: true, beforeMinutes: 60 },
  { label: '1 day before', enabled: true, beforeMinutes: 1440 }
];

interface AlarmSelectorProps {
  alarmEnabled?: boolean;
  alarmBeforeMinutes?: number | null;
  alarmNeedsReview?: boolean;
  canSelectTimedAlarm: boolean;
  onChange: (alarmEnabled: boolean, alarmBeforeMinutes: number | null) => void;
}

export function AlarmSelector({
  alarmEnabled = false,
  alarmBeforeMinutes = null,
  alarmNeedsReview = false,
  canSelectTimedAlarm,
  onChange
}: AlarmSelectorProps) {
  const selectedLabel = getAlarmLabel(alarmBeforeMinutes, alarmEnabled);

  return (
    <div className="alarm-selector">
      <div className="field field--tight">
        <span>Alarm for calendar export</span>
        <div className="chip-group">
          {OPTIONS.map((option) => {
            const isSelected =
              option.enabled === alarmEnabled &&
              ((option.beforeMinutes == null && alarmBeforeMinutes == null) || option.beforeMinutes === alarmBeforeMinutes);
            const isDisabled = !canSelectTimedAlarm && option.enabled;

            return (
              <button
                key={option.label}
                type="button"
                className={`chip ${isSelected ? 'is-selected' : ''}`}
                disabled={isDisabled}
                onClick={() => onChange(option.enabled, option.beforeMinutes)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="subcopy">
        {canSelectTimedAlarm
          ? `Current: ${selectedLabel}.`
          : alarmNeedsReview
            ? 'Confirm the date and time first.'
            : 'Add a clear time first for alarms.'}
      </p>
    </div>
  );
}

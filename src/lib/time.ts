import type { DueBucket, TimeBand } from '../types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

export function formatDateLabel(date: Date) {
  return DATE_FORMATTER.format(date);
}

export function formatTimeLabel(date: Date) {
  return TIME_FORMATTER.format(date);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeBand(date: Date): TimeBand {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }

  if (hour >= 18 && hour < 24) {
    return 'evening';
  }

  return 'night';
}

export function getTimeBandLabel(timeBand: TimeBand) {
  switch (timeBand) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
    case 'night':
      return 'Late';
  }
}

export function getGreetingCopy(date: Date) {
  switch (getTimeBand(date)) {
    case 'morning':
      return {
        greeting: 'Fresh morning',
        status: 'Start with one clear task before the day gets noisy.',
        tagline: 'Start with one thing.'
      };
    case 'afternoon':
      return {
        greeting: 'Back in motion',
        status: 'Pick one useful thing and keep moving.',
        tagline: 'Stop deciding. Start doing.'
      };
    case 'evening':
      return {
        greeting: 'Close a loop',
        status: 'A smaller task is usually the best way to end the day well.',
        tagline: 'Not another todo list. Just your next move.'
      };
    case 'night':
      return {
        greeting: 'Keep it light',
        status: 'Choose something small enough to finish tonight.',
        tagline: 'One thing to do now.'
      };
  }
}

export function getDueLabel(due: DueBucket) {
  switch (due) {
    case 'today':
      return 'Today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'thisWeek':
      return 'This week';
    case 'none':
      return 'No due date';
  }
}

export function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

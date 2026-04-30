import type { DueBucket, PreferredTime, TimeBand } from '../types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const EXACT_TIME_PATTERN = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

export interface TemporalInfo {
  dateText?: string;
  timeText?: string;
  parsedDate?: string;
  parsedTime?: string;
  parsedDateTime?: string;
  due: DueBucket;
  preferredTime: PreferredTime;
  needsDateReview: boolean;
  needsTimeReview: boolean;
}

export function formatDateLabel(date: Date) {
  return DATE_FORMATTER.format(date);
}

export function formatTimeLabel(date: Date) {
  return TIME_FORMATTER.format(date);
}

export function formatParsedDate(dateText: string) {
  return SHORT_DATE_FORMATTER.format(dateFromDateKey(dateText));
}

export function formatParsedTime(timeText: string) {
  const [hours, minutes] = timeText.split(':').map(Number);
  const date = new Date(2026, 0, 1, hours, minutes);
  return TIME_FORMATTER.format(date);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function capitalizePhrase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function setLocalTime(date: Date, hours: number, minutes: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

function getPreferredTimeFromText(timeText?: string): PreferredTime {
  if (!timeText) {
    return 'anytime';
  }

  const lowered = timeText.toLowerCase();

  if (/\bmorning\b|before lunch/i.test(lowered)) {
    return 'morning';
  }

  if (/\bafternoon\b|noon|after lunch/i.test(lowered)) {
    return 'afternoon';
  }

  if (/\bevening\b|\btonight\b|before dinner/i.test(lowered)) {
    return 'evening';
  }

  return 'anytime';
}

function toTimeKey(hours: number, minutes: number) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function resolveWeekday(baseDate: Date, weekday: number, forceNextWeek: boolean) {
  const current = startOfDay(baseDate);
  const currentWeekday = current.getDay();
  let distance = weekday - currentWeekday;

  if (forceNextWeek) {
    distance = distance <= 0 ? distance + 7 : distance + 7;
  } else if (distance < 0) {
    distance += 7;
  }

  return addDays(current, distance);
}

function resolveDateText(dateText: string | undefined, now: Date) {
  if (!dateText) {
    return {
      parsedDate: undefined,
      needsDateReview: false
    };
  }

  const lowered = normalizeWhitespace(dateText.toLowerCase());

  if (lowered === 'today' || lowered === 'this morning' || lowered === 'this afternoon' || lowered === 'this evening') {
    return {
      parsedDate: toDateKey(now),
      needsDateReview: false
    };
  }

  if (lowered === 'tomorrow' || lowered === 'tonight') {
    const base = lowered === 'tonight' ? now : addDays(now, 1);
    return {
      parsedDate: toDateKey(base),
      needsDateReview: false
    };
  }

  if (lowered === 'this week' || lowered === 'next week') {
    return {
      parsedDate: undefined,
      needsDateReview: true
    };
  }

  const nextWeekMatch = lowered.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextWeekMatch) {
    return {
      parsedDate: toDateKey(resolveWeekday(now, WEEKDAY_INDEX[nextWeekMatch[1]], true)),
      needsDateReview: false
    };
  }

  const modifierMatch = lowered.match(/^(?:on|by|before)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (modifierMatch) {
    return {
      parsedDate: toDateKey(resolveWeekday(now, WEEKDAY_INDEX[modifierMatch[1]], false)),
      needsDateReview: false
    };
  }

  if (WEEKDAY_INDEX[lowered] !== undefined) {
    return {
      parsedDate: toDateKey(resolveWeekday(now, WEEKDAY_INDEX[lowered], false)),
      needsDateReview: false
    };
  }

  return {
    parsedDate: undefined,
    needsDateReview: true
  };
}

function resolveTimeText(timeText: string | undefined) {
  if (!timeText) {
    return {
      parsedTime: undefined,
      needsTimeReview: false
    };
  }

  const lowered = normalizeWhitespace(timeText.toLowerCase());

  if (lowered === 'noon') {
    return {
      parsedTime: '12:00',
      needsTimeReview: false
    };
  }

  if (lowered === 'midnight') {
    return {
      parsedTime: '00:00',
      needsTimeReview: false
    };
  }

  const exactMatch = lowered.match(EXACT_TIME_PATTERN);
  if (exactMatch) {
    let hours = Number(exactMatch[1]);
    const minutes = Number(exactMatch[2] ?? '0');
    const meridiem = exactMatch[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    }

    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return {
      parsedTime: toTimeKey(hours, minutes),
      needsTimeReview: false
    };
  }

  if (
    lowered === 'morning' ||
    lowered === 'afternoon' ||
    lowered === 'evening' ||
    lowered === 'tonight' ||
    lowered === 'before lunch' ||
    lowered === 'before dinner'
  ) {
    return {
      parsedTime: undefined,
      needsTimeReview: true
    };
  }

  return {
    parsedTime: undefined,
    needsTimeReview: true
  };
}

function inferDueBucket(parsedDate: string | undefined, dateText: string | undefined, now: Date): DueBucket {
  if (parsedDate) {
    const todayKey = toDateKey(now);
    const tomorrowKey = toDateKey(addDays(now, 1));

    if (parsedDate === todayKey) {
      return 'today';
    }

    if (parsedDate === tomorrowKey) {
      return 'tomorrow';
    }

    const diff = dateFromDateKey(parsedDate).getTime() - startOfDay(now).getTime();
    if (diff <= 6 * 24 * 60 * 60 * 1000) {
      return 'thisWeek';
    }

    return 'none';
  }

  if (!dateText) {
    return 'none';
  }

  if (/\btoday\b|\btonight\b|this morning|this afternoon|this evening/i.test(dateText)) {
    return 'today';
  }

  if (/\btomorrow\b/i.test(dateText)) {
    return 'tomorrow';
  }

  if (/\bthis week\b|\bnext week\b|\bfriday\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bsaturday\b|\bsunday\b/i.test(dateText)) {
    return 'thisWeek';
  }

  return 'none';
}

export function extractDateText(text: string) {
  const normalized = normalizeWhitespace(text);

  const orderedPatterns = [
    /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    /\b((?:by|before|on)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    /\b(this morning|this afternoon|this evening)\b/i,
    /\b(today|tomorrow|tonight|this week|next week)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  ];

  for (const pattern of orderedPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return capitalizePhrase(match[1].toLowerCase());
    }
  }

  return undefined;
}

export function extractTimeText(text: string) {
  const normalized = normalizeWhitespace(text);

  const orderedPatterns = [
    /\b(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\b(noon|midnight|before lunch|before dinner|after lunch|morning|afternoon|evening)\b/i
  ];

  for (const pattern of orderedPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return capitalizePhrase(match[1].toLowerCase());
    }
  }

  return undefined;
}

export function resolveTemporalInfo(dateText: string | undefined, timeText: string | undefined, now = new Date()): TemporalInfo {
  const normalizedDateText = dateText ? capitalizePhrase(normalizeWhitespace(dateText)) : undefined;
  const normalizedTimeText = timeText ? capitalizePhrase(normalizeWhitespace(timeText)) : undefined;
  const dateResolution = resolveDateText(normalizedDateText, now);
  const timeResolution = resolveTimeText(normalizedTimeText);

  let parsedDateTime: string | undefined;

  if (dateResolution.parsedDate && timeResolution.parsedTime) {
    const date = dateFromDateKey(dateResolution.parsedDate);
    const [hours, minutes] = timeResolution.parsedTime.split(':').map(Number);
    parsedDateTime = setLocalTime(date, hours, minutes).toISOString();
  }

  return {
    dateText: normalizedDateText,
    timeText: normalizedTimeText,
    parsedDate: dateResolution.parsedDate,
    parsedTime: timeResolution.parsedTime,
    parsedDateTime,
    due: inferDueBucket(dateResolution.parsedDate, normalizedDateText, now),
    preferredTime: getPreferredTimeFromText(normalizedTimeText),
    needsDateReview: dateResolution.needsDateReview || Boolean(normalizedTimeText && !dateResolution.parsedDate),
    needsTimeReview: Boolean(dateResolution.parsedDate && normalizedTimeText && timeResolution.needsTimeReview)
  };
}

export function extractTemporalInfo(text: string, now = new Date()): TemporalInfo {
  return resolveTemporalInfo(extractDateText(text), extractTimeText(text), now);
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
        status: 'Start with one useful follow-up before the day gets noisy.',
        tagline: 'Capture the plan. Keep the reminder.'
      };
    case 'afternoon':
      return {
        greeting: 'Back in motion',
        status: 'Check what might slip, then move one thing forward.',
        tagline: 'Messages in. Tasks, events, and reminders out.'
      };
    case 'evening':
      return {
        greeting: 'Close a loop',
        status: 'A quick review now can stop tomorrow from becoming another retyping session.',
        tagline: 'Add alarms before you forget.'
      };
    case 'night':
      return {
        greeting: 'Keep it light',
        status: 'Confirm one upcoming detail before it disappears into tomorrow.',
        tagline: 'Stop retyping tasks and plans.'
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

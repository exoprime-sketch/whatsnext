import { formatParsedDate, formatParsedTime } from './time';
import type { TaskDraft } from '../types';

type CalendarItem = Pick<
  TaskDraft,
  | 'title'
  | 'memo'
  | 'itemType'
  | 'parsedDateTime'
  | 'parsedDate'
  | 'parsedTime'
  | 'dateText'
  | 'timeText'
  | 'locationText'
  | 'personText'
  | 'originalText'
  | 'alarmEnabled'
  | 'alarmBeforeMinutes'
  | 'alarmNeedsReview'
  | 'needsDateReview'
  | 'needsTimeReview'
  | 'durationMinutes'
  | 'calendarReady'
>;

function escapeICSValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toICSDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function inferDurationMinutes(item: CalendarItem) {
  const text = [item.title, item.memo, item.originalText].filter(Boolean).join(' ');

  if (item.itemType === 'reminder') {
    return 15;
  }

  if (/\b(dinner|lunch|coffee|appointment|doctor|dentist)\b/i.test(text)) {
    return 90;
  }

  if (/\b(meeting|call|sync|check-in|check in|interview|review)\b/i.test(text)) {
    return 30;
  }

  return item.durationMinutes || 60;
}

function buildAlarmBlock(item: CalendarItem) {
  if (!item.alarmEnabled || item.alarmBeforeMinutes == null || item.alarmNeedsReview || !item.parsedDateTime) {
    return '';
  }

  const beforeMinutes = item.alarmBeforeMinutes;
  let trigger = '-PT0M';

  if (beforeMinutes === 10) {
    trigger = '-PT10M';
  } else if (beforeMinutes === 30) {
    trigger = '-PT30M';
  } else if (beforeMinutes === 60) {
    trigger = '-PT1H';
  } else if (beforeMinutes === 1440) {
    trigger = '-P1D';
  }

  return [
    'BEGIN:VALARM',
    `TRIGGER:${trigger}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSValue(item.title)}`,
    'END:VALARM'
  ].join('\r\n');
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy copy.
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', 'true');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.select();
  const success = document.execCommand('copy');
  document.body.removeChild(helper);
  return success;
}

export function canExportICS(item: CalendarItem) {
  return Boolean(item.itemType !== 'task' && item.calendarReady && item.parsedDateTime && !item.needsDateReview && !item.needsTimeReview);
}

export function buildCalendarDescription(item: CalendarItem) {
  const lines = [
    item.memo,
    item.locationText ? `Location: ${item.locationText}` : '',
    item.personText ? `With: ${item.personText}` : '',
    item.originalText ? `Captured from: ${item.originalText}` : ''
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildEventDetailsText(item: CalendarItem) {
  const lines = [item.title];

  if (item.parsedDate) {
    lines.push(`Date: ${formatParsedDate(item.parsedDate)}`);
  } else if (item.dateText) {
    lines.push(`Date: ${item.dateText}`);
  }

  if (item.parsedTime) {
    lines.push(`Time: ${formatParsedTime(item.parsedTime)}`);
  } else if (item.timeText) {
    lines.push(`Time: ${item.timeText}`);
  }

  if (item.locationText) {
    lines.push(`Location: ${item.locationText}`);
  }

  if (item.personText) {
    lines.push(`With: ${item.personText}`);
  }

  if (item.alarmEnabled && item.alarmBeforeMinutes != null) {
    lines.push(`Alarm: ${item.alarmBeforeMinutes === 0 ? 'At time' : `${item.alarmBeforeMinutes} minutes before`}`);
  }

  const description = buildCalendarDescription(item);
  if (description) {
    lines.push('', description);
  }

  return lines.join('\n');
}

export function buildICS(item: CalendarItem) {
  if (!canExportICS(item)) {
    throw new Error('Calendar export requires a clear date and time.');
  }

  const startDate = new Date(item.parsedDateTime!);
  const endDate = new Date(startDate.getTime() + inferDurationMinutes(item) * 60 * 1000);
  const uid = `${slugify(item.title)}-${startDate.getTime()}@whatsnext.local`;
  const description = buildCalendarDescription(item);
  const alarmBlock = buildAlarmBlock(item);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Whats Next//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDateTime(new Date())}`,
    `SUMMARY:${escapeICSValue(item.title)}`,
    `DESCRIPTION:${escapeICSValue(description)}`,
    `DTSTART:${toICSDateTime(startDate)}`,
    `DTEND:${toICSDateTime(endDate)}`,
    item.locationText ? `LOCATION:${escapeICSValue(item.locationText)}` : '',
    alarmBlock,
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadICS(item: CalendarItem) {
  const ics = buildICS(item);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(item.title) || 'whats-next-event'}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function copyEventDetails(item: CalendarItem) {
  return copyText(buildEventDetailsText(item));
}

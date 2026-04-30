import type { CaptureCandidate, DueBucket, ItemType, PreferredTime, TaskDraft } from '../types';
import { DEFAULT_TASK_DRAFT } from './tasks';

const DURATION_OPTIONS = [5, 10, 15, 30, 60] as const;
const DAY_PATTERN =
  /\b(today|tonight|tomorrow|this morning|this afternoon|this evening|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const TIME_PATTERN =
  /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)|noon|midnight|before lunch|after lunch|end of day|eod)\b/i;
const EVENT_PATTERN =
  /\b(meeting|meet|call|appointment|lunch|dinner|breakfast|check-in|check in|sync|visit|demo|calendar|interview|session|doctor|dentist|flight)\b/i;
const REMINDER_PATTERN =
  /\b(remember|remind|don't forget|dont forget|follow up|follow-up|check back|ping|nudge|circle back)\b/i;
const ACTION_PATTERN =
  /\b(reply|send|review|finish|draft|prepare|plan|check|confirm|call|book|schedule|update|share|pay|submit|organize|clean|email|message|meet|join|follow up)\b/i;

export const SAMPLE_CAPTURE_TEXT = `Please send the revised intro by tomorrow morning.
Project check-in with Sarah tomorrow at 3 PM on Zoom.
Don't forget to book the dentist appointment this week.
Review the budget notes before lunch.`;

function clampDuration(value: number) {
  return DURATION_OPTIONS.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value) ? current : closest;
  }, 15 as (typeof DURATION_OPTIONS)[number]);
}

function capitalizeWords(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function guessDue(text: string): DueBucket {
  if (/\btoday\b|\btonight\b|this morning|this afternoon|this evening|by end of day|eod/i.test(text)) {
    return 'today';
  }

  if (/\btomorrow\b|\btmr\b|by tomorrow/i.test(text)) {
    return 'tomorrow';
  }

  if (/\bthis week\b|\bnext week\b|by friday|before the weekend|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b/i.test(text)) {
    return 'thisWeek';
  }

  return 'none';
}

function guessPreferredTime(text: string): PreferredTime {
  if (/\bmorning\b|before lunch/i.test(text)) {
    return 'morning';
  }

  if (/\bafternoon\b|after lunch|noon/i.test(text)) {
    return 'afternoon';
  }

  if (/\bevening\b|\btonight\b/i.test(text)) {
    return 'evening';
  }

  return 'anytime';
}

function guessImportance(text: string): TaskDraft['importance'] {
  if (/\burgent\b|\bimportant\b|\bpriority\b|\bmust\b|\basap\b/i.test(text)) {
    return 'high';
  }

  if (/\bshould\b|\bneed to\b|follow up|review/i.test(text)) {
    return 'medium';
  }

  return 'low';
}

function guessDuration(text: string, itemType: ItemType): TaskDraft['durationMinutes'] {
  const explicit = text.match(/(\d+)\s*(min|mins|minutes)\b/i);

  if (explicit) {
    return clampDuration(Number(explicit[1]));
  }

  if (itemType === 'event') {
    if (/doctor|dentist|interview|flight/i.test(text)) {
      return 60;
    }

    return 30;
  }

  if (itemType === 'reminder') {
    return 5;
  }

  if (/report|calendar|outline|draft|review|presentation|planning|budget/i.test(text)) {
    return 30;
  }

  if (/reply|check|confirm|clean|organize|plan|follow up|call|book/i.test(text)) {
    return 10;
  }

  return DEFAULT_TASK_DRAFT.durationMinutes;
}

function extractDateLabel(text: string) {
  if (/this morning/i.test(text)) {
    return 'This morning';
  }

  if (/this afternoon/i.test(text)) {
    return 'This afternoon';
  }

  if (/this evening/i.test(text)) {
    return 'This evening';
  }

  if (/\btoday\b/i.test(text)) {
    return 'Today';
  }

  if (/\btonight\b/i.test(text)) {
    return 'Tonight';
  }

  if (/\btomorrow\b|\btmr\b/i.test(text)) {
    return 'Tomorrow';
  }

  if (/\bthis week\b/i.test(text)) {
    return 'This week';
  }

  if (/\bnext week\b/i.test(text)) {
    return 'Next week';
  }

  const dayMatch = text.match(DAY_PATTERN);
  return dayMatch ? capitalizeWords(dayMatch[1].toLowerCase()) : undefined;
}

function formatTimeLabel(token: string) {
  const compact = normalizeWhitespace(token).toUpperCase();

  if (compact === 'EOD') {
    return 'End of day';
  }

  if (compact === 'NOON' || compact === 'MIDNIGHT') {
    return capitalizeWords(compact.toLowerCase());
  }

  if (compact === 'BEFORE LUNCH' || compact === 'AFTER LUNCH') {
    return capitalizeWords(compact.toLowerCase());
  }

  return compact.replace(/AM|PM/, (suffix) => suffix);
}

function extractTimeLabel(text: string) {
  const match = text.match(TIME_PATTERN);
  return match ? formatTimeLabel(match[1]) : undefined;
}

function trimCapturedLabel(value: string) {
  return normalizeWhitespace(
    value
      .replace(/["'.,]/g, ' ')
      .replace(/\b(?:today|tonight|tomorrow|this|next|before|after|at|in|on|via)\b$/i, ' ')
  );
}

function extractPersonLabel(text: string) {
  const match = text.match(/\bwith\s+([^,.;\n]+?)(?=\s+(?:today|tonight|tomorrow|this|next|at|in|on|via|before|after)\b|$)/i);
  if (!match) {
    return undefined;
  }

  const label = trimCapturedLabel(match[1]);
  return label ? capitalizeWords(label) : undefined;
}

function extractLocationLabel(text: string) {
  const videoMatch = text.match(/\b(?:on|via)\s+(zoom|google meet|meet|teams|phone)\b/i);
  if (videoMatch) {
    return capitalizeWords(videoMatch[1].toLowerCase());
  }

  const placeMatch = text.match(/\b(?:in|at)\s+([^,.;\n]+?)(?=\s+(?:today|tonight|tomorrow|this|next|before|after|with)\b|$)/i);
  if (!placeMatch) {
    return undefined;
  }

  const label = trimCapturedLabel(placeMatch[1]);
  if (!label || TIME_PATTERN.test(label)) {
    return undefined;
  }

  return capitalizeWords(label.toLowerCase());
}

function inferItemType(text: string, dateLabel?: string, timeLabel?: string, locationLabel?: string): ItemType {
  const reminderScore = REMINDER_PATTERN.test(text) ? 2 : 0;
  const eventScore =
    (EVENT_PATTERN.test(text) ? 2 : 0) +
    (dateLabel || timeLabel ? 1 : 0) +
    (locationLabel ? 1 : 0);

  if (eventScore >= 2) {
    return 'event';
  }

  if (reminderScore >= 2) {
    return 'reminder';
  }

  if ((dateLabel || timeLabel) && /\b(with|join|meet|call|zoom|teams|appointment)\b/i.test(text)) {
    return 'event';
  }

  return 'task';
}

function normalizeActionText(fragment: string) {
  return fragment
    .replace(/["'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSchedulingContext(fragment: string) {
  return normalizeActionText(
    fragment
      .replace(/\b(today|tonight|tomorrow|this morning|this afternoon|this evening|this week|next week)\b/gi, ' ')
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, ' ')
      .replace(/\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)|noon|midnight|before lunch|after lunch|end of day|eod)\b/gi, ' ')
      .replace(/\b(?:on|via)\s+(?:zoom|google meet|meet|teams|phone)\b/gi, ' ')
      .replace(/\b(?:in|at)\s+[^,.;\n]+$/gi, ' ')
      .replace(/\bcan you\b|\bcould you\b|\bplease\b|\bneed to\b|\bremember to\b|\bdon't forget to\b|\bdont forget to\b/gi, ' ')
  );
}

function toActionTitle(fragment: string) {
  const verbPhrases = [
    'reply to',
    'follow up on',
    'follow up',
    'review',
    'draft',
    'send',
    'check',
    'confirm',
    'plan',
    'prepare',
    'clean',
    'clear',
    'call',
    'outline',
    'finish',
    'book',
    'schedule',
    'join',
    'meet',
    'pay',
    'submit'
  ];

  const lowered = fragment.toLowerCase();

  for (const phrase of verbPhrases) {
    const index = lowered.indexOf(phrase);
    if (index >= 0) {
      const extracted = normalizeActionText(fragment.slice(index));
      if (extracted) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
  }

  let title = fragment
    .replace(/\bthe\b|\ba\b|\ban\b/gi, ' ')
    .replace(/^\s*(and|also|then)\s+/i, ' ');

  title = normalizeActionText(title);

  if (!title) {
    return '';
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function buildTitle(fragment: string, itemType: ItemType) {
  const stripped = stripSchedulingContext(fragment);

  if (itemType === 'reminder') {
    const reminderTitle = stripped
      .replace(/\bremember\b|\bremind me\b|\bdon't forget\b|\bdont forget\b/gi, ' ')
      .trim();
    const title = toActionTitle(reminderTitle);
    return title || 'Reminder';
  }

  const title = toActionTitle(stripped);
  if (title) {
    return title;
  }

  if (itemType === 'event') {
    return capitalizeWords(stripped || 'Calendar event');
  }

  return capitalizeWords(stripped || 'Task');
}

function buildConfidence(text: string, itemType: ItemType, dateLabel?: string, timeLabel?: string) {
  let score = 0.48;

  if (ACTION_PATTERN.test(text)) {
    score += 0.16;
  }

  if (itemType === 'event' && (dateLabel || timeLabel)) {
    score += 0.18;
  }

  if (itemType === 'reminder' && REMINDER_PATTERN.test(text)) {
    score += 0.14;
  }

  if (EVENT_PATTERN.test(text) || REMINDER_PATTERN.test(text)) {
    score += 0.08;
  }

  if (text.length <= 120) {
    score += 0.06;
  }

  return Math.min(0.96, Number(score.toFixed(2)));
}

function toCandidate(fragment: string): CaptureCandidate | null {
  const cleaned = normalizeWhitespace(fragment);
  if (cleaned.length < 4) {
    return null;
  }

  const dateLabel = extractDateLabel(cleaned);
  const timeLabel = extractTimeLabel(cleaned);
  const personLabel = extractPersonLabel(cleaned);
  const locationLabel = extractLocationLabel(cleaned);
  const itemType = inferItemType(cleaned, dateLabel, timeLabel, locationLabel);
  const title = buildTitle(cleaned, itemType);

  if (!title || title.length < 3) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    title,
    memo: '',
    durationMinutes: guessDuration(cleaned, itemType),
    importance: guessImportance(cleaned),
    due: guessDue(cleaned),
    preferredTime: guessPreferredTime(cleaned),
    itemType,
    dateLabel,
    timeLabel,
    personLabel,
    locationLabel,
    confidence: buildConfidence(cleaned, itemType, dateLabel, timeLabel),
    rawText: cleaned,
    selected: true
  };
}

export function extractCaptureCandidates(text: string): CaptureCandidate[] {
  const fragments = text
    .replace(/\r/g, '\n')
    .split(/[\n]+|[.!?]+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length >= 4);

  const candidates: CaptureCandidate[] = [];

  fragments.forEach((fragment) => {
    const candidate = toCandidate(fragment);

    if (candidate) {
      candidates.push(candidate);
    }
  });

  return candidates.slice(0, 8);
}

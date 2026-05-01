import type { CaptureCandidate, ConfidenceLevel, ItemType, TaskDraft } from '../types';
import { extractTemporalInfo } from './time';
import { applyDraftScheduling, DEFAULT_TASK_DRAFT } from './tasks';

const DURATION_OPTIONS = [5, 10, 15, 30, 60] as const;
const EVENT_PATTERN =
  /\b(meeting|meet|call|appointment|lunch|dinner|breakfast|coffee|check-in|check in|sync|visit|demo|calendar|interview|session|doctor|dentist|flight|review)\b/i;
const REMINDER_PATTERN =
  /\b(remember|remind|don't forget|dont forget|follow up|follow-up|check back|ping|nudge|circle back|bring|buy|pick up|book|pack)\b/i;
const ACTION_PATTERN =
  /\b(reply|send|review|finish|draft|prepare|plan|check|confirm|call|book|schedule|update|share|pay|submit|organize|clean|email|message|meet|join|follow up)\b/i;
const ACTION_LEAD_PATTERN =
  /^(?:also\s+|then\s+)?(?:can you\s+|could you\s+|please\s+)?(?:reply|send|review|finish|draft|prepare|plan|check|confirm|call|book|schedule|update|share|pay|submit|organize|clean|email|message|meet|join|follow up|bring|buy|remember|don't forget|dont forget|remind)\b/i;
const EVENT_LEAD_PATTERN =
  /^(?:the\s+)?(?:meeting|meet|call|appointment|lunch|dinner|breakfast|coffee|check-in|check in|sync|visit|demo|calendar|interview|session|doctor|dentist|flight)\b/i;
const CLAUSE_SPLIT_PATTERN =
  /(?:,\s*|\s+\band\b\s+)(?=(?:also\s+|then\s+)?(?:reply|send|review|finish|draft|prepare|plan|check|confirm|call|book|schedule|update|share|pay|submit|organize|clean|email|message|meet|join|follow up|bring|buy|remember|don't forget|dont forget|remind)\b)/i;

export const SAMPLE_CAPTURE_TEXT = `Please send the revised report by Friday.
Check the budget numbers tomorrow morning and prepare slides for next week's review.
Dinner with Mina on Saturday at 7 PM near Gangnam Station.
Don't forget to book a table before Friday.`;

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

function guessImportance(text: string): TaskDraft['importance'] {
  if (/\burgent\b|\bimportant\b|\bpriority\b|\bmust\b|\basap\b/i.test(text)) {
    return 'high';
  }

  if (/\bshould\b|\bneed to\b|follow up|review|deadline/i.test(text)) {
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

    if (/dinner|lunch|coffee|breakfast/i.test(text)) {
      return 60;
    }

    return 30;
  }

  if (itemType === 'reminder') {
    return 10;
  }

  if (/report|calendar|outline|draft|review|presentation|planning|budget|slides/i.test(text)) {
    return 30;
  }

  if (/reply|check|confirm|clean|organize|plan|follow up|call|book|submit|send/i.test(text)) {
    return 10;
  }

  return DEFAULT_TASK_DRAFT.durationMinutes;
}

function extractLocationText(text: string) {
  const videoMatch = text.match(/\b(?:on|via)\s+(zoom|google meet|meet|teams|phone)\b/i);
  if (videoMatch) {
    return capitalizeWords(videoMatch[1].toLowerCase());
  }

  const orderedPatterns = [
    /\bnear\s+([^,.;\n]+?)(?=\s+(?:today|tomorrow|tonight|this|next|before|with|on|via|at)\b|$)/i,
    /\bin\s+([^,.;\n]+?)(?=\s+(?:today|tomorrow|tonight|this|next|before|with|on|via|at)\b|$)/i,
    /\bat\s+([^,.;\n]+?)(?=\s+(?:today|tomorrow|tonight|this|next|before|with|on|via)\b|$)/i
  ];

  for (const pattern of orderedPatterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const label = normalizeWhitespace(match[1].replace(/["'.,]/g, ' '));
    if (!label || /^\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(label)) {
      continue;
    }

    return capitalizeWords(label.toLowerCase());
  }

  return undefined;
}

function extractPersonText(text: string) {
  const match = text.match(
    /\bwith\s+([^,.;\n]+?)(?=\s+(?:today|tomorrow|tonight|this|next|before|after|at|in|near|on|via)\b|$)/i
  );
  if (!match) {
    return undefined;
  }

  const label = normalizeWhitespace(match[1].replace(/["'.,]/g, ' '));
  return label ? capitalizeWords(label) : undefined;
}

function inferItemType(text: string, hasDateOrTime: boolean, hasLocation: boolean): ItemType {
  const reminderScore = REMINDER_PATTERN.test(text) ? 2 : 0;
  const eventScore = (EVENT_PATTERN.test(text) ? 2 : 0) + (hasDateOrTime ? 1 : 0) + (hasLocation ? 1 : 0);
  const actionDriven = ACTION_LEAD_PATTERN.test(text);
  const eventLead = EVENT_LEAD_PATTERN.test(text);
  const timeDriven = /\b(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})?\s*(?:am|pm)|morning|afternoon|evening|tonight|noon|midnight)\b/i.test(
    text
  );
  const socialCue = /\b(dinner|lunch|coffee|breakfast|appointment|doctor|dentist|flight|visit)\b/i.test(text);

  if (reminderScore >= 2) {
    return 'reminder';
  }

  if (eventLead || socialCue) {
    return 'event';
  }

  if (timeDriven && /\b(with|join|meet|call|zoom|teams|appointment|sync|check-in|check in)\b/i.test(text)) {
    return 'event';
  }

  if (actionDriven && !timeDriven && !hasLocation) {
    return 'task';
  }

  if (eventScore >= 2) {
    return 'event';
  }

  if (hasDateOrTime && /\b(with|join|meet|call|zoom|teams|appointment|dinner|lunch|coffee)\b/i.test(text)) {
    return 'event';
  }

  return 'task';
}

function splitCompoundFragment(fragment: string) {
  const normalized = normalizeWhitespace(fragment);

  if (!CLAUSE_SPLIT_PATTERN.test(normalized)) {
    return [normalized];
  }

  const parts = normalized
    .split(CLAUSE_SPLIT_PATTERN)
    .map((part) => normalizeWhitespace(part.replace(/^(?:and|also|then)\s+/i, ' ')))
    .filter((part) => part.length >= 4);

  return parts.length > 0 ? parts : [normalized];
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
      .replace(/\b(today|tomorrow|tonight|this morning|this afternoon|this evening)\b/gi, ' ')
      .replace(/\b(this week|next week)(?:'s)?\b/gi, ' ')
      .replace(/\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, ' ')
      .replace(/\b((?:by|before|on)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, ' ')
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, ' ')
      .replace(
        /\b(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight|morning|afternoon|evening|before lunch|before dinner)\b/gi,
        ' '
      )
      .replace(/\b(?:on|via)\s+(?:zoom|google meet|meet|teams|phone)\b/gi, ' ')
      .replace(/\b(?:near|in|at)\s+[^,.;\n]+$/gi, ' ')
      .replace(/\bcan you\b|\bcould you\b|\bplease\b|\bneed to\b|\bremember to\b|\bdon't forget to\b|\bdont forget to\b/gi, ' ')
  );
}

function toActionTitle(fragment: string) {
  const verbPhrases = [
    'reply to',
    'follow up on',
    'follow up',
    'send',
    'submit',
    'prepare',
    'check',
    'confirm',
    'review',
    'draft',
    'update',
    'email',
    'message',
    'organize',
    'schedule',
    'share',
    'pay',
    'plan',
    'clean',
    'clear',
    'call',
    'outline',
    'finish',
    'book',
    'join',
    'meet',
    'bring',
    'buy'
  ];

  const lowered = fragment.toLowerCase();
  let bestMatch: { index: number; phrase: string } | null = null;

  for (const phrase of verbPhrases) {
    const index = lowered.indexOf(phrase);
    if (index < 0) {
      continue;
    }

    if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && phrase.length > bestMatch.phrase.length)) {
      bestMatch = { index, phrase };
    }
  }

  if (bestMatch) {
    const extracted = normalizeActionText(fragment.slice(bestMatch.index)).replace(/\b(by|before|on|at)\b$/i, '').trim();
    if (extracted) {
      return extracted.charAt(0).toUpperCase() + extracted.slice(1);
    }
  }

  const title = normalizeActionText(
    fragment
      .replace(/\bthe\b|\ba\b|\ban\b/gi, ' ')
      .replace(/^\s*(and|also|then)\s+/i, ' ')
  );

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

function buildConfidenceLevel(
  itemType: ItemType,
  hasExactDate: boolean,
  hasExactTime: boolean,
  text: string
): ConfidenceLevel {
  let score = 0.42;

  if (ACTION_PATTERN.test(text)) {
    score += 0.18;
  }

  if (EVENT_PATTERN.test(text) || REMINDER_PATTERN.test(text)) {
    score += 0.1;
  }

  if (hasExactDate) {
    score += 0.14;
  }

  if (hasExactTime) {
    score += 0.16;
  }

  if (itemType === 'event' && hasExactDate && hasExactTime) {
    score += 0.08;
  }

  if (score >= 0.82) {
    return 'high';
  }

  if (score >= 0.62) {
    return 'medium';
  }

  return 'low';
}

function toCandidate(fragment: string, now: Date): CaptureCandidate | null {
  const cleaned = normalizeWhitespace(fragment);
  if (cleaned.length < 4) {
    return null;
  }

  const temporal = extractTemporalInfo(cleaned, now);
  const locationText = extractLocationText(cleaned);
  const personText = extractPersonText(cleaned);
  const itemType = inferItemType(cleaned, Boolean(temporal.dateText || temporal.timeText), Boolean(locationText));
  const title = buildTitle(cleaned, itemType);

  if (!title || title.length < 3) {
    return null;
  }

  return applyDraftScheduling(
    {
      id: crypto.randomUUID(),
      title,
      memo: '',
      durationMinutes: guessDuration(cleaned, itemType),
      importance: guessImportance(cleaned),
      due: temporal.due,
      preferredTime: temporal.preferredTime,
      itemType,
      dateText: temporal.dateText,
      timeText: temporal.timeText,
      parsedDate: temporal.parsedDate,
      parsedTime: temporal.parsedTime,
      parsedDateTime: temporal.parsedDateTime,
      locationText,
      personText,
      originalText: cleaned,
      confidence: buildConfidenceLevel(itemType, Boolean(temporal.parsedDate), Boolean(temporal.parsedTime), cleaned),
      needsDateReview: temporal.needsDateReview,
      needsTimeReview: temporal.needsTimeReview,
      selected: true
    },
    now
  ) as CaptureCandidate;
}

export function refreshCaptureCandidate(candidate: CaptureCandidate, now = new Date()) {
  return applyDraftScheduling(candidate, now) as CaptureCandidate;
}

export function extractCaptureCandidates(text: string, now = new Date()): CaptureCandidate[] {
  const fragments = text
    .replace(/\r/g, '\n')
    .split(/[\n]+|[.!?]+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length >= 4)
    .flatMap((fragment) => splitCompoundFragment(fragment));

  const candidates: CaptureCandidate[] = [];

  fragments.forEach((fragment) => {
    const candidate = toCandidate(fragment, now);

    if (candidate) {
      const duplicate = candidates.some((item) => item.title.toLowerCase() === candidate.title.toLowerCase());
      if (!duplicate) {
        candidates.push(candidate);
      }
    }
  });

  return candidates.slice(0, 8);
}

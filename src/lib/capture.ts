import type { CaptureCandidate, DueBucket, PreferredTime, TaskDraft } from '../types';
import { DEFAULT_TASK_DRAFT } from './tasks';

const DURATION_OPTIONS = [5, 10, 15, 30, 60] as const;

function clampDuration(value: number) {
  return DURATION_OPTIONS.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value) ? current : closest;
  }, 15 as (typeof DURATION_OPTIONS)[number]);
}

function guessDue(text: string): DueBucket {
  if (/\btoday\b|\btonight\b|this afternoon|this evening|by end of day|eod/i.test(text)) {
    return 'today';
  }

  if (/\btomorrow\b|\btmr\b|by tomorrow/i.test(text)) {
    return 'tomorrow';
  }

  if (/\bthis week\b|by friday|before the weekend/i.test(text)) {
    return 'thisWeek';
  }

  return 'none';
}

function guessPreferredTime(text: string): PreferredTime {
  if (/\bmorning\b|before lunch/i.test(text)) {
    return 'morning';
  }

  if (/\bafternoon\b|after lunch/i.test(text)) {
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

  return 'medium';
}

function guessDuration(text: string): TaskDraft['durationMinutes'] {
  const explicit = text.match(/(\d+)\s*(min|mins|minutes)\b/i);

  if (explicit) {
    return clampDuration(Number(explicit[1]));
  }

  if (/meeting|report|calendar|outline|draft|review|presentation|planning/i.test(text)) {
    return 30;
  }

  if (/reply|check|confirm|clean|organize|plan|follow up|call/i.test(text)) {
    return 10;
  }

  return DEFAULT_TASK_DRAFT.durationMinutes;
}

function normalizeActionText(fragment: string) {
  return fragment
    .replace(/["'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    'finish'
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
    .replace(/\bby tomorrow\b|\btomorrow\b|\btoday\b|\btonight\b|\bthis week\b|\burgent\b|\bimportant\b|\basap\b/gi, ' ')
    .replace(/\bmorning\b|\bafternoon\b|\bevening\b/gi, ' ')
    .replace(/\bcan you\b|\bcould you\b|\bplease\b|\bneed to\b|\bremember to\b|\bdon't forget to\b/gi, ' ')
    .replace(/\bthe\b|\ba\b|\ban\b/gi, ' ');

  title = normalizeActionText(title).replace(/^\s*(and|also|then)\s+/i, '');

  if (!title) {
    return '';
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function extractTaskCandidates(text: string): CaptureCandidate[] {
  const fragments = text
    .replace(/\r/g, '\n')
    .split(/[\n.!?]+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length >= 4);

  const candidates: CaptureCandidate[] = [];

  fragments.forEach((fragment) => {
    const title = toActionTitle(fragment);

    if (!title || title.length < 3) {
      return;
    }

    candidates.push({
      id: crypto.randomUUID(),
      title,
      memo: '',
      durationMinutes: guessDuration(fragment),
      importance: guessImportance(fragment),
      due: guessDue(fragment),
      preferredTime: guessPreferredTime(fragment),
      rawText: fragment,
      selected: true
    });
  });

  return candidates.slice(0, 6);
}

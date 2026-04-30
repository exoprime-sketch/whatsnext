import type { CaptureCandidate, DueBucket, PreferredTime, TaskDraft } from '../types';
import { DEFAULT_TASK_DRAFT } from './tasks';

const DURATION_OPTIONS = [5, 10, 15, 30, 60] as const;

function clampDuration(value: number) {
  return DURATION_OPTIONS.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value) ? current : closest;
  }, 15 as (typeof DURATION_OPTIONS)[number]);
}

function guessDue(text: string): DueBucket {
  if (/오늘까지|오늘 중|오늘/.test(text)) {
    return 'today';
  }

  if (/내일까지|내일/.test(text)) {
    return 'tomorrow';
  }

  if (/이번 주|금주|주중/.test(text)) {
    return 'thisWeek';
  }

  return 'none';
}

function guessPreferredTime(text: string): PreferredTime {
  if (/오전|아침/.test(text)) {
    return 'morning';
  }

  if (/오후/.test(text)) {
    return 'afternoon';
  }

  if (/저녁|밤/.test(text)) {
    return 'evening';
  }

  return 'anytime';
}

function guessImportance(text: string): TaskDraft['importance'] {
  if (/중요|급|우선|꼭/.test(text)) {
    return 'high';
  }

  if (/확인|정리|준비|답장/.test(text)) {
    return 'medium';
  }

  return 'medium';
}

function guessDuration(text: string): TaskDraft['durationMinutes'] {
  const explicit = text.match(/(\d+)\s*분/);

  if (explicit) {
    return clampDuration(Number(explicit[1]));
  }

  if (/회의|보고서|자료|초안|작성/.test(text)) {
    return 30;
  }

  if (/답장|확인|정리|챙기/.test(text)) {
    return 10;
  }

  return DEFAULT_TASK_DRAFT.durationMinutes;
}

function toActionTitle(fragment: string) {
  let title = fragment
    .replace(/내일까지|내일|오늘까지|오늘|이번 주|금주|주중/g, ' ')
    .replace(/오전|아침|오후|저녁|밤/g, ' ')
    .replace(/부탁드립니다|부탁드려요|부탁해요|해주세요|해 주세요|주세요/g, ' ')
    .replace(/확인 부탁드립니다|확인 부탁드려요/g, '확인')
    .replace(/보내주세요|보내 주세요/g, '보내')
    .replace(/도\s+/g, ' ')
    .replace(/[“”"'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  title = title.replace(/^\s*(그리고|또|및)\s+/g, '').trim();

  if (!title) {
    return '';
  }

  const replacements: Array<[RegExp, string]> = [
    [/보내$/, '보내기'],
    [/챙기$/, '챙기기'],
    [/답하$/, '답하기'],
    [/검토하$/, '검토하기'],
    [/작성하$/, '작성하기'],
    [/정리$/, '정리하기'],
    [/확인$/, '확인하기'],
    [/답장$/, '답장하기'],
    [/준비$/, '준비하기'],
    [/공유$/, '공유하기'],
    [/정하기$/, '정하기']
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(title)) {
      return title.replace(pattern, replacement);
    }
  }

  if (/(하기|기)$/.test(title)) {
    return title;
  }

  if (/하$/.test(title)) {
    return `${title}기`;
  }

  return `${title}하기`;
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

      if (!title) {
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

  return candidates;
}

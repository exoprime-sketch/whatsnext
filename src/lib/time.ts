import type { DueBucket, TimeBand } from '../types';

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
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
      return '아침';
    case 'afternoon':
      return '오후';
    case 'evening':
      return '저녁';
    case 'night':
      return '밤';
  }
}

export function getGreetingCopy(date: Date) {
  switch (getTimeBand(date)) {
    case 'morning':
      return {
        greeting: '좋은 아침이에요',
        status: '머리가 맑을 때 하나 먼저 끝내볼까요?',
        tagline: '오늘 하나만 먼저 해볼까요?'
      };
    case 'afternoon':
      return {
        greeting: '오후 흐름이 올라왔어요',
        status: '생각은 줄이고, 지금 할 일 하나만 남겼어요.',
        tagline: '지금은 이것부터 하면 됩니다.'
      };
    case 'evening':
      return {
        greeting: '저녁엔 가볍게 정리하는 편이 좋아요',
        status: '부담 적은 일부터 마무리해두기 좋은 시간이에요.',
        tagline: '긴 계획표 대신 지금 할 일 하나.'
      };
    case 'night':
      return {
        greeting: '늦은 시간에는 짧은 일이 잘 맞아요',
        status: '오늘을 닫기 전에 가볍게 하나만 처리해볼까요?',
        tagline: '작게라도 앞으로 가는 쪽으로 골랐어요.'
      };
  }
}

export function getDueLabel(due: DueBucket) {
  switch (due) {
    case 'today':
      return '오늘';
    case 'tomorrow':
      return '내일';
    case 'thisWeek':
      return '이번 주';
    case 'none':
      return '마감 없음';
  }
}

export function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

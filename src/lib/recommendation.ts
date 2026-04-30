import type { RecommendationResult, Task, TimeBand } from '../types';
import { getTimeBand, getTimeBandLabel, toDateKey } from './time';

const IMPORTANCE_SCORE = {
  high: 30,
  medium: 15,
  low: 5
} as const;

const DUE_SCORE = {
  today: 35,
  tomorrow: 20,
  thisWeek: 10,
  none: 0
} as const;

function isDurationFit(durationMinutes: Task['durationMinutes'], timeBand: TimeBand) {
  if (timeBand === 'night') {
    return durationMinutes <= 15;
  }

  if (timeBand === 'morning') {
    return durationMinutes <= 30;
  }

  if (timeBand === 'afternoon') {
    return durationMinutes >= 15;
  }

  return durationMinutes <= 30;
}

function wasRecentlyRejected(task: Task, now: Date) {
  if (task.lastFeedbackType !== 'negative' || !task.lastFeedbackAt) {
    return false;
  }

  const diff = now.getTime() - new Date(task.lastFeedbackAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export function scoreTask(task: Task, now: Date) {
  if (task.status === 'completed') {
    return { score: Number.NEGATIVE_INFINITY, reasons: [] as string[] };
  }

  const todayKey = toDateKey(now);
  if (task.excludedToday && task.excludedOnDate === todayKey) {
    return { score: Number.NEGATIVE_INFINITY, reasons: [] as string[] };
  }

  if (task.snoozeUntil && new Date(task.snoozeUntil).getTime() > now.getTime()) {
    return { score: Number.NEGATIVE_INFINITY, reasons: [] as string[] };
  }

  const currentBand = getTimeBand(now);
  let score = 0;
  const reasons: string[] = [];

  score += IMPORTANCE_SCORE[task.importance];
  score += DUE_SCORE[task.due];

  if (task.due === 'today') {
    reasons.push('오늘 마감인 작업입니다.');
  } else if (task.due === 'tomorrow') {
    reasons.push('내일 전에 손대두면 훨씬 편해집니다.');
  } else if (task.due === 'thisWeek') {
    reasons.push('이번 주 안에 끝내야 해서 미리 건드리는 편이 좋습니다.');
  }

  if (task.importance === 'high') {
    reasons.push('중요도가 높게 표시된 일입니다.');
  } else if (task.importance === 'medium') {
    reasons.push('오늘 흐름 안에서 챙겨두기 좋은 우선순위입니다.');
  }

  if (task.preferredTime === currentBand) {
    score += 15;
    reasons.push(`${getTimeBandLabel(currentBand)}에 하기로 둔 일이라 지금 흐름과 맞습니다.`);
  }

  if (isDurationFit(task.durationMinutes, currentBand)) {
    score += 10;
    reasons.push(`${task.durationMinutes}분이면 지금 시작하기 부담이 적습니다.`);
  }

  if (task.snoozeCount > 0) {
    score += task.snoozeCount * 5;
    reasons.push(`최근 ${task.snoozeCount}번 미뤄서 더 늦기 전에 처리하는 편이 좋습니다.`);
  }

  if (wasRecentlyRejected(task, now)) {
    score -= 25;
  }

  return { score, reasons };
}

export function getNowRecommendation(tasks: Task[], now: Date): RecommendationResult {
  const ranked = tasks
    .map((task) => {
      const result = scoreTask(task, now);
      return { task, score: result.score, reasons: result.reasons };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return {
      task: null,
      score: 0,
      reasons: []
    };
  }

  return {
    task: ranked[0].task,
    score: ranked[0].score,
    reasons: ranked[0].reasons.slice(0, 3)
  };
}

export function sortTasksByRecommendation(tasks: Task[], now: Date) {
  return [...tasks].sort((left, right) => {
    const leftScore = scoreTask(left, now).score;
    const rightScore = scoreTask(right, now).score;

    if (Number.isFinite(leftScore) && Number.isFinite(rightScore)) {
      return rightScore - leftScore;
    }

    if (Number.isFinite(leftScore)) {
      return -1;
    }

    if (Number.isFinite(rightScore)) {
      return 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

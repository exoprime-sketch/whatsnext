import type { RecommendationResult, Task, TimeBand } from '../types';
import { getTimeBand, toDateKey } from './time';

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

function getTimeFitReason(timeBand: TimeBand) {
  switch (timeBand) {
    case 'morning':
      return 'This is a good first task for the morning.';
    case 'afternoon':
      return 'This fits the middle of the day well.';
    case 'evening':
      return 'This is a good evening task.';
    case 'night':
      return 'This is light enough for late hours.';
  }
}

function getDurationReason(durationMinutes: Task['durationMinutes']) {
  if (durationMinutes <= 15) {
    return 'It fits a short work session.';
  }

  return 'Small enough to start without blocking your whole hour.';
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
    reasons.push('This is due today.');
  } else if (task.due === 'tomorrow') {
    reasons.push('Getting ahead of tomorrow will make later easier.');
  } else if (task.due === 'thisWeek') {
    reasons.push('This is worth touching before the week gets crowded.');
  }

  if (task.importance === 'high') {
    reasons.push('This looks worth clearing early.');
  }

  if (task.preferredTime === currentBand) {
    score += 15;
    reasons.push(getTimeFitReason(currentBand));
  }

  if (isDurationFit(task.durationMinutes, currentBand)) {
    score += 10;
    reasons.push(getDurationReason(task.durationMinutes));
  }

  if (task.snoozeCount > 0) {
    score += task.snoozeCount * 5;
    reasons.push(
      task.snoozeCount === 1
        ? "You've delayed this once already."
        : `You've delayed this ${task.snoozeCount} times already.`
    );
  }

  if (wasRecentlyRejected(task, now)) {
    score -= 25;
  }

  if (reasons.length === 0) {
    reasons.push('Small enough to start now.');
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

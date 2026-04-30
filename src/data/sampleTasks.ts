import type { Task } from '../types';
import { createTaskFromDraft } from '../lib/tasks';

export function sampleTasks(now: Date): Task[] {
  return [
    createTaskFromDraft(
      {
        title: '오늘 업무 우선순위 3개 정리하기',
        memo: '가장 중요한 일 세 가지만 뽑아두면 하루가 훨씬 가벼워집니다.',
        durationMinutes: 15,
        importance: 'high',
        due: 'today',
        preferredTime: 'morning'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '미뤄둔 메시지 답장하기',
        memo: '답이 길 필요는 없어요. 짧게라도 보내두면 됩니다.',
        durationMinutes: 10,
        importance: 'medium',
        due: 'today',
        preferredTime: 'afternoon'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '보고서 목차 20분만 정리하기',
        memo: '완성보다 시작이 목적입니다.',
        durationMinutes: 30,
        importance: 'high',
        due: 'thisWeek',
        preferredTime: 'afternoon'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '운동복 챙기기',
        memo: '',
        durationMinutes: 5,
        importance: 'medium',
        due: 'today',
        preferredTime: 'evening'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '이번 주 일정 확인하기',
        memo: '',
        durationMinutes: 10,
        importance: 'medium',
        due: 'thisWeek',
        preferredTime: 'morning'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '책상 정리 10분 하기',
        memo: '시야가 정리되면 집중도도 같이 올라갑니다.',
        durationMinutes: 10,
        importance: 'low',
        due: 'none',
        preferredTime: 'evening'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: '내일 해야 할 일 하나 정하기',
        memo: '오늘 마무리 전에 하나만 정해두세요.',
        durationMinutes: 5,
        importance: 'medium',
        due: 'today',
        preferredTime: 'evening'
      },
      now,
      'sample'
    )
  ];
}

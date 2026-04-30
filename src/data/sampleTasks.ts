import type { Task } from '../types';
import { createTaskFromDraft } from '../lib/tasks';

export function sampleTasks(now: Date): Task[] {
  return [
    createTaskFromDraft(
      {
        title: "Review today's calendar",
        memo: 'Clear the day before it starts to sprawl.',
        durationMinutes: 10,
        importance: 'high',
        due: 'today',
        preferredTime: 'morning',
        itemType: 'task'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Reply to one important message',
        memo: 'One useful reply is enough to get moving.',
        durationMinutes: 10,
        importance: 'high',
        due: 'today',
        preferredTime: 'afternoon',
        itemType: 'task'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Project check-in',
        memo: 'An example of a calendar-ready event saved locally in the PWA.',
        durationMinutes: 30,
        importance: 'medium',
        due: 'tomorrow',
        preferredTime: 'afternoon',
        itemType: 'event',
        dateLabel: 'Tomorrow',
        timeLabel: '3:00 PM',
        personLabel: 'Design team',
        locationLabel: 'Zoom'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Follow up with finance',
        memo: 'A reminder can stay lightweight too.',
        durationMinutes: 10,
        importance: 'medium',
        due: 'thisWeek',
        preferredTime: 'morning',
        itemType: 'reminder',
        personLabel: 'Finance'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: "Plan tomorrow's first task",
        memo: '',
        durationMinutes: 5,
        importance: 'medium',
        due: 'today',
        preferredTime: 'evening',
        itemType: 'task'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Take a short walk',
        memo: '',
        durationMinutes: 15,
        importance: 'low',
        due: 'none',
        preferredTime: 'afternoon',
        itemType: 'task'
      },
      now,
      'sample'
    )
  ];
}

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
        preferredTime: 'morning'
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
        preferredTime: 'afternoon'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Draft the first paragraph',
        memo: "Don't finish it. Just start it.",
        durationMinutes: 30,
        importance: 'high',
        due: 'thisWeek',
        preferredTime: 'morning'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Clear inbox for 10 minutes',
        memo: 'A short pass is enough.',
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
        title: "Plan tomorrow's first task",
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
        title: 'Take a short walk',
        memo: '',
        durationMinutes: 15,
        importance: 'low',
        due: 'none',
        preferredTime: 'afternoon'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Clean up your desk',
        memo: 'Make the next work block easier to enter.',
        durationMinutes: 10,
        importance: 'low',
        due: 'none',
        preferredTime: 'evening'
      },
      now,
      'sample'
    )
  ];
}

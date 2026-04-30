import type { Task } from '../types';
import { createTaskFromDraft } from '../lib/tasks';
import { addDays, toDateKey } from '../lib/time';

function atLocal(date: Date, hours: number, minutes: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0).toISOString();
}

function nextWeekday(baseDate: Date, targetDay: number) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  while (date.getDay() !== targetDay) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function sampleTasks(now: Date): Task[] {
  const tomorrow = addDays(now, 1);
  const saturday = nextWeekday(tomorrow, 6);

  return [
    createTaskFromDraft(
      {
        title: "Review today's calendar",
        memo: 'Clear the day before it starts to sprawl.',
        durationMinutes: 10,
        importance: 'high',
        due: 'today',
        preferredTime: 'morning',
        itemType: 'task',
        dateText: 'Today',
        confidence: 'high'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Project check-in',
        memo: 'Calendar-ready sample event saved locally in the PWA.',
        durationMinutes: 30,
        importance: 'medium',
        due: 'tomorrow',
        preferredTime: 'afternoon',
        itemType: 'event',
        dateText: 'Tomorrow',
        timeText: '3 PM',
        parsedDate: toDateKey(tomorrow),
        parsedTime: '15:00',
        parsedDateTime: atLocal(tomorrow, 15, 0),
        personText: 'Design team',
        locationText: 'Zoom',
        confidence: 'high',
        alarmEnabled: true,
        alarmBeforeMinutes: 10,
        alarmLabel: '10 minutes before',
        calendarReady: true
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Dinner with Mina',
        memo: 'A social plan that can export cleanly.',
        durationMinutes: 60,
        importance: 'medium',
        due: 'thisWeek',
        preferredTime: 'evening',
        itemType: 'event',
        dateText: 'Saturday',
        timeText: '7 PM',
        parsedDate: toDateKey(saturday),
        parsedTime: '19:00',
        parsedDateTime: atLocal(saturday, 19, 0),
        personText: 'Mina',
        locationText: 'Gangnam Station',
        confidence: 'high',
        alarmEnabled: true,
        alarmBeforeMinutes: 60,
        alarmLabel: '1 hour before',
        calendarReady: true
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Bring the charger',
        memo: 'Reminder example that still needs a clearer time.',
        durationMinutes: 10,
        importance: 'medium',
        due: 'tomorrow',
        preferredTime: 'morning',
        itemType: 'reminder',
        dateText: 'Tomorrow',
        timeText: 'Morning',
        parsedDate: toDateKey(tomorrow),
        confidence: 'medium',
        needsTimeReview: true,
        alarmEnabled: false,
        alarmBeforeMinutes: null,
        alarmLabel: 'Needs time review'
      },
      now,
      'sample'
    ),
    createTaskFromDraft(
      {
        title: 'Send the revised intro',
        memo: 'Deadline-style task with a date but no exact time yet.',
        durationMinutes: 10,
        importance: 'high',
        due: 'thisWeek',
        preferredTime: 'morning',
        itemType: 'task',
        dateText: 'By Friday',
        parsedDate: toDateKey(now),
        confidence: 'medium',
        alarmEnabled: true,
        alarmBeforeMinutes: 1440,
        alarmLabel: '1 day before'
      },
      now,
      'sample'
    )
  ];
}

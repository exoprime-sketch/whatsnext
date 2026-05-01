import { useEffect, useRef } from 'react';
import { TaskCard } from './TaskCard';
import { addDays, dateFromDateKey, toDateKey } from '../lib/time';
import type { Task } from '../types';

interface UpcomingPanelProps {
  tasks: Task[];
  now: Date;
  onEdit: (task: Task) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onDownloadICS: (task: Task) => void;
  onCopyDetails: (task: Task) => void;
  onViewed: () => void;
}

function getSortTime(task: Task) {
  if (task.parsedDateTime) {
    return new Date(task.parsedDateTime).getTime();
  }

  if (task.parsedDate) {
    return dateFromDateKey(task.parsedDate).getTime();
  }

  return new Date(task.createdAt).getTime();
}

function renderTaskList(
  items: Task[],
  onEdit: (task: Task) => void,
  onComplete: ((taskId: string) => void) | undefined,
  onDelete: ((taskId: string) => void) | undefined,
  onDownloadICS: (task: Task) => void,
  onCopyDetails: (task: Task) => void
) {
  return items.length > 0 ? (
    <div className="stack">
      {items.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onComplete={task.status === 'active' ? onComplete : undefined}
          onDelete={onDelete}
          onDownloadICS={onDownloadICS}
          onCopyDetails={onCopyDetails}
        />
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <h3>Nothing to chase right now.</h3>
    </div>
  );
}

function renderGroup(
  title: string,
  items: Task[],
  onEdit: (task: Task) => void,
  onComplete: ((taskId: string) => void) | undefined,
  onDelete: ((taskId: string) => void) | undefined,
  onDownloadICS: (task: Task) => void,
  onCopyDetails: (task: Task) => void
) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="upcoming-group">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{items.length} item{items.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      {renderTaskList(items, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
    </section>
  );
}

export function UpcomingPanel({
  tasks,
  now,
  onEdit,
  onComplete,
  onDelete,
  onDownloadICS,
  onCopyDetails,
  onViewed
}: UpcomingPanelProps) {
  const viewedRef = useRef(false);
  const activeItems = tasks.filter((task) => task.status === 'active').sort((left, right) => getSortTime(left) - getSortTime(right));
  const todayKey = toDateKey(now);
  const tomorrowKey = toDateKey(addDays(now, 1));
  const usedIds = new Set<string>();
  const needsReview = activeItems.filter((task) => task.needsDateReview || task.needsTimeReview);

  needsReview.forEach((task) => {
    usedIds.add(task.id);
  });

  const today = activeItems.filter((task) => {
    if (usedIds.has(task.id)) {
      return false;
    }

    return task.parsedDate === todayKey || task.due === 'today';
  });

  today.forEach((task) => {
    usedIds.add(task.id);
  });

  const tomorrow = activeItems.filter((task) => {
    if (usedIds.has(task.id)) {
      return false;
    }

    return task.parsedDate === tomorrowKey || task.due === 'tomorrow';
  });

  tomorrow.forEach((task) => {
    usedIds.add(task.id);
  });

  const thisWeek = activeItems.filter((task) => {
    if (usedIds.has(task.id)) {
      return false;
    }

    if (task.parsedDate) {
      const diffDays = (dateFromDateKey(task.parsedDate).getTime() - dateFromDateKey(todayKey).getTime()) / (24 * 60 * 60 * 1000);
      return diffDays >= 0 && diffDays <= 6;
    }

    return task.due === 'thisWeek';
  });

  thisWeek.forEach((task) => {
    usedIds.add(task.id);
  });

  const laterOrNoDate = activeItems.filter((task) => !usedIds.has(task.id));
  const visibleGroupCount = [today, tomorrow, thisWeek, needsReview, laterOrNoDate].filter((group) => group.length > 0).length;

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }

    viewedRef.current = true;
    onViewed();
  }, [onViewed]);

  return (
    <section className="panel panel--quiet">
      {visibleGroupCount === 0 ? (
        <div className="empty-state">
          <h3>Nothing to chase right now.</h3>
        </div>
      ) : (
        <>
          {renderGroup('Today', today, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
          {renderGroup('Tomorrow', tomorrow, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
          {renderGroup('This week', thisWeek, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
          {renderGroup('Needs review', needsReview, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
          {renderGroup('Later', laterOrNoDate, onEdit, onComplete, onDelete, onDownloadICS, onCopyDetails)}
        </>
      )}
    </section>
  );
}

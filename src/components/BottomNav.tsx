import type { AppView } from '../types';

const ITEMS: Array<{ key: AppView; label: string }> = [
  { key: 'capture', label: 'Capture' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'now', label: 'Now' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'settings', label: 'Settings' }
];

interface BottomNavProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
}

export function BottomNav({ activeView, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main tabs">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-nav__item ${activeView === item.key ? 'is-active' : ''}`}
          aria-current={activeView === item.key ? 'page' : undefined}
          onClick={() => onChange(item.key)}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

import type { AppView } from '../types';

const ITEMS: Array<{ key: AppView; label: string; icon: string }> = [
  { key: 'today', label: 'Now', icon: '●' },
  { key: 'add', label: 'Add', icon: '+' },
  { key: 'list', label: 'Tasks', icon: '≣' },
  { key: 'capture', label: 'Capture', icon: '⌲' },
  { key: 'settings', label: 'Settings', icon: '◦' }
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
          onClick={() => onChange(item.key)}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

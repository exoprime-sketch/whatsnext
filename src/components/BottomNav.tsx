import type { AppView } from '../types';

const ITEMS: Array<{ key: AppView; label: string; icon: string }> = [
  { key: 'today', label: '오늘', icon: '◉' },
  { key: 'add', label: '추가', icon: '+' },
  { key: 'list', label: '목록', icon: '≡' },
  { key: 'capture', label: '캡처', icon: '⌁' },
  { key: 'settings', label: '설정', icon: '○' }
];

interface BottomNavProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
}

export function BottomNav({ activeView, onChange }: BottomNavProps) {
  const visibleActiveView = activeView === 'history' ? 'today' : activeView;

  return (
    <nav className="bottom-nav" aria-label="주요 탭">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-nav__item ${visibleActiveView === item.key ? 'is-active' : ''}`}
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

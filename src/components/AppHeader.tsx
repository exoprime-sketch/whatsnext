import { BrandMark } from './BrandMark';
import { brand } from '../lib/brand';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBrand?: boolean;
}

export function AppHeader({ title, subtitle, showBrand = false }: AppHeaderProps) {
  return (
    <div className="app-header">
      {showBrand ? (
        <div className="app-wordmark">
          <BrandMark size={42} />
          <div className="app-wordmark__copy">
            <strong>{brand.name}</strong>
          </div>
        </div>
      ) : null}
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

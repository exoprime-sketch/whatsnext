interface BrandMarkProps {
  className?: string;
  size?: number;
}

export function BrandMark({ className = '', size = 40 }: BrandMarkProps) {
  const classes = ['brand-mark', className].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="39" height="39" rx="13" className="brand-mark__tile" />
      <path d="M14 14.5H30" className="brand-mark__line" />
      <path d="M14 21.5H24" className="brand-mark__line brand-mark__line--soft" />
      <circle cx="30.5" cy="29" r="6.5" className="brand-mark__dot" />
      <path d="M18.5 27.5L23 32L31.5 23.5" className="brand-mark__check" />
    </svg>
  );
}

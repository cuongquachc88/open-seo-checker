import * as React from 'react';
import { cn } from '@/lib/utils';

export type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<BrandMarkSize, { icon: number; word: string; gap: string }> = {
  sm: { icon: 24, word: 'text-sm', gap: 'gap-2' },
  md: { icon: 32, word: 'text-base font-semibold', gap: 'gap-3' },
  lg: { icon: 48, word: 'text-2xl font-bold tracking-tight', gap: 'gap-4' },
  xl: { icon: 64, word: 'text-4xl font-extrabold tracking-tighter', gap: 'gap-5' },
};

interface BrandMarkProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: BrandMarkSize;
  /** When true, render only the icon (no wordmark). */
  iconOnly?: boolean;
  /** When true, render only the wordmark (no icon). */
  wordOnly?: boolean;
  /** Subtitle displayed under the wordmark for larger sizes. */
  subtitle?: string;
  /** Render colour variant. `gradient` uses the brand gradient; `solid` uses primary fill. */
  variant?: 'gradient' | 'solid';
}

/**
 * The Open SEO Checker brand mark. Uses the same SVG used by the favicon so
 * the on-screen logo and browser tab stay visually in sync. Renderable as a
 * small sidebar chip up to a giant hero on the dashboard.
 */
export function BrandMark({
  size = 'md',
  iconOnly = false,
  wordOnly = false,
  subtitle,
  variant = 'gradient',
  className,
  ...rest
}: BrandMarkProps) {
  const { icon, word, gap } = SIZES[size];
  const fillId = React.useId();

  const iconSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={icon}
      height={icon}
      aria-label="Open SEO Checker"
      role="img"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={fillId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx={Math.max(6, icon / 4)} fill={variant === 'gradient' ? `url(#${fillId})` : '#6366f1'} />
      <path d="M9 22L16 7L23 22H20L16 13L12 22H9Z" fill="white" opacity="0.95" />
      <circle cx="16" cy="19" r={Math.max(1.5, icon / 12)} fill="white" />
    </svg>
  );

  if (iconOnly) {
    return (
      <div className={cn('inline-flex shrink-0 items-center', className)} {...rest}>
        {iconSvg}
      </div>
    );
  }

  if (wordOnly) {
    return (
      <span
        className={cn(
          word,
          'bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 leading-none',
          className,
        )}
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
      >
        Open&nbsp;SEO&nbsp;Checker
      </span>
    );
  }

  return (
    <div
      className={cn('inline-flex items-center', gap, className)}
      {...rest}
    >
      {iconSvg}
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            word,
            'bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500',
          )}
        >
          Open&nbsp;SEO&nbsp;Checker
        </span>
        {subtitle ? (
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/80">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default BrandMark;

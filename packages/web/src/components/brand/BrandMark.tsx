import * as React from 'react';
import { cn } from '@/lib/utils';

export type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Role pins the brand mark to one of the two sides we ship:
 *
 *   fe       →  the web SPA itself      (#d946ef magenta/violet, solid).
 *   be       →  the Hono + SQLite API   (#3b82f6 blue, solid).
 *   neutral  →  neither (marketing)     (#6366f1 indigo, solid).
 *
 * The text is always a solid colour — no `bg-clip-text` / `text-transparent`
 * tricks that fail on renderers that ignore `-webkit-text-fill-color`. The
 * icon background still supports the brand gradient for the default role.
 */
export type BrandRole = 'fe' | 'be' | 'neutral';

const ROLE_TOKEN = {
  fe: '#d946ef',
  be: '#3b82f6',
  neutral: '#6366f1',
} as const;

const ROLE_BG = {
  fe: 'rgba(217, 70, 239, 0.10)',
  be: 'rgba(59, 130, 246, 0.10)',
  neutral: 'rgba(99, 102, 241, 0.10)',
} as const;

const ROLE_RING = {
  fe: '1px solid rgba(217, 70, 239, 0.35)',
  be: '1px solid rgba(59, 130, 246, 0.35)',
  neutral: '1px solid rgba(99, 102, 241, 0.35)',
} as const;

const ROLE_LABEL = {
  fe: 'FRONTEND',
  be: 'BACKEND',
  neutral: 'BRAND',
} as const;

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
  /** Render colour variant for the icon. `gradient` uses the brand gradient; `solid` uses the role fill. */
  variant?: 'gradient' | 'solid';
  /** Which role this logo stands for — drives the solid colour of the wordmark. */
  role?: BrandRole;
  /** Show a coloured tag chip (the role name as `[FRONTEND]` / `[BACKEND]`) next to the icon. */
  showTag?: boolean;
}

/**
 * The Open SEO Checker brand mark. Uses the same SVG used by the favicon so
 * the on-screen logo and browser tab stay visually in sync. Renderable as a
 * small sidebar chip up to a giant hero on the dashboard.
 *
 * The wordmark is always rendered with a solid, role-specific colour so the
 * two halves of the system are visually distinguishable at a glance — the
 * SPA (FE) tints magenta, while API/server (BE) contexts tint blue.
 */
export function BrandMark({
  size = 'md',
  iconOnly = false,
  wordOnly = false,
  subtitle,
  variant = 'gradient',
  role = 'fe',
  showTag = false,
  className,
  ...rest
}: BrandMarkProps) {
  const { icon, word, gap } = SIZES[size];
  const fillId = React.useId();
  const accent = ROLE_TOKEN[role];

  const iconSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={icon}
      height={icon}
      aria-label={`Open SEO Checker (${ROLE_LABEL[role]})`}
      role="img"
      className="shrink-0"
    >
      <defs>
        {variant === 'gradient' ? (
          <linearGradient id={fillId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ROLE_TOKEN.be} />
            <stop offset="55%" stopColor={ROLE_TOKEN.neutral} />
            <stop offset="100%" stopColor={ROLE_TOKEN.fe} />
          </linearGradient>
        ) : null}
      </defs>
      <rect
        width="32"
        height="32"
        rx={Math.max(6, icon / 4)}
        fill={variant === 'gradient' && role !== 'neutral' ? `url(#${fillId})` : accent}
      />
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

  const wordmarkStyle: React.CSSProperties = {
    color: accent,
    // explicit webkit-text-fill-color overrides any inherited transparent fill
    WebkitTextFillColor: accent,
  };

  const wordmark = (
    <span
      className={cn(word, 'leading-none')}
      style={wordmarkStyle}
    >
      Open&nbsp;SEO&nbsp;Checker
    </span>
  );

  const tagChip = showTag ? (
    <span
      className="ml-2 inline-flex items-center rounded-md px-2 py-[2px] text-[10px] font-bold tracking-widest"
      style={{
        color: accent,
        background: ROLE_BG[role],
        boxShadow: ROLE_RING[role],
      }}
    >
      {ROLE_LABEL[role]}
    </span>
  ) : null;

  if (wordOnly) {
    return (
      <span
        className={cn('inline-flex items-center', className)}
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {wordmark}
        {tagChip}
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
        <span className="inline-flex items-center">
          {wordmark}
          {tagChip}
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

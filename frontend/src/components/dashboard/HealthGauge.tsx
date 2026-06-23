import * as React from 'react';
import { cn } from '@/lib/utils';

interface HealthGaugeProps {
  value: number; // 0-100
  size?: number; // px
  label?: string;
  hideValue?: boolean;
  className?: string;
}

function getColor(value: number): string {
  if (value >= 90) return 'hsl(142 76% 45%)';
  if (value >= 75) return 'hsl(199 89% 55%)';
  if (value >= 60) return 'hsl(48 96% 53%)';
  if (value >= 40) return 'hsl(28 92% 56%)';
  return 'hsl(0 84% 60%)';
}

function getGrade(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 75) return 'Good';
  if (value >= 60) return 'Average';
  if (value >= 40) return 'Poor';
  return 'Critical';
}

export function HealthGauge({
  value,
  size = 160,
  label,
  hideValue,
  className,
}: HealthGaugeProps) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);
  const stroke = Math.max(6, size / 14);
  const color = getColor(safe);
  const gradientId = React.useId();

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Health score: ${safe} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hideValue ? null : (
          <>
            <div
              className="font-bold leading-none tracking-tight tabular-nums"
              style={{ fontSize: size / 4.2, color }}
            >
              {safe}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              {label || getGrade(safe)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

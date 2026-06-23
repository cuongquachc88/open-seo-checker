import * as React from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted';
  loading?: boolean;
  className?: string;
}

const accentColors: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  delta,
  icon: Icon,
  accent = 'primary',
  loading,
  className,
}: StatCardProps) {
  const displayValue =
    typeof value === 'number' ? formatNumber(value) : value;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className={cn('relative overflow-hidden p-0', className)}>
      <div className="flex items-start justify-between p-5 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <div className={cn('rounded-md p-2', accentColors[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="px-5 pb-5">
        {loading ? (
          <div className="h-9 w-24 rounded bg-muted animate-pulse" />
        ) : (
          <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {displayValue}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {delta ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn('inline-flex items-center gap-1 font-medium', trendColor)}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {delta}
                </span>
              </TooltipTrigger>
              {hint ? <TooltipContent>{hint}</TooltipContent> : null}
            </Tooltip>
          ) : null}
          {hint && !delta ? <span>{hint}</span> : null}
        </div>
      </div>
      <div
        className={cn('absolute inset-x-0 bottom-0 h-0.5 opacity-70', accentColors[accent])}
        aria-hidden
      />
    </Card>
  );
}

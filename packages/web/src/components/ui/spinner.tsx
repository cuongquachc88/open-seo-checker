import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Spinner({ size = 16, className, ...props }: SpinnerProps) {
  return (
    <div className={cn('inline-flex items-center', className)} {...props}>
      <Loader2
        className="animate-spin text-muted-foreground"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

interface CenteredLoaderProps {
  message?: string;
  className?: string;
}

export function CenteredLoader({ message = 'Loading…', className }: CenteredLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground',
        className,
      )}
    >
      <Spinner size={28} className="text-primary" />
      <span>{message}</span>
    </div>
  );
}

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success:
          'border-transparent bg-success/15 text-success ring-1 ring-success/30',
        warning:
          'border-transparent bg-warning/15 text-warning-foreground ring-1 ring-warning/30',
        info:
          'border-transparent bg-info/15 text-info ring-1 ring-info/30',
        danger:
          'border-transparent bg-destructive/15 text-destructive ring-1 ring-destructive/30',
        neutral:
          'border-transparent bg-muted text-muted-foreground ring-1 ring-border',
        muted:
          'border-transparent bg-muted text-muted-foreground ring-1 ring-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

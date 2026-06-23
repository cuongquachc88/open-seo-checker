import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function Empty({ icon, title, description, action, className, ...props }: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3 p-10 rounded-xl border border-dashed bg-muted/30',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="rounded-full bg-primary/10 text-primary p-3">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { Empty };

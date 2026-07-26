import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={cn(
        'border-border bg-card flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-16 text-center',
        className
      )}
    >
      <p className="text-foreground text-base font-semibold">{title}</p>
      {description ? (
        <p className="text-muted max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

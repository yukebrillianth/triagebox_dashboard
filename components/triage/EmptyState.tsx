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
        'border-border bg-card flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      <p className="text-foreground text-sm font-semibold">{title}</p>
      {description ? (
        <p className="text-muted max-w-sm text-xs leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

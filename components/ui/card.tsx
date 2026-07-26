import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article';
};

export function Card({
  as: Comp = 'section',
  className,
  ...props
}: CardProps) {
  return (
    <Comp
      className={cn('border-border bg-card border', className)}
      {...props}
    />
  );
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'border-border flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="min-w-0">
            {title ? (
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-muted mt-0.5 text-xs">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </>
      )}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={cn('space-y-4 p-4', className)} {...props} />;
}

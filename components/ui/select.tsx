import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'border-border bg-background text-foreground min-h-11 w-full border px-3 text-sm',
          'disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed',
          invalid && 'border-triage-red',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

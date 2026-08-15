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
          'bg-surface-input text-foreground rounded-control min-h-11 w-full px-3 text-[0.8125rem] outline-none',
          'focus:ring-accent/50 focus:ring-2 focus:ring-inset',
          'disabled:text-dim disabled:cursor-not-allowed',
          invalid && 'ring-triage-red ring-2 ring-inset',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

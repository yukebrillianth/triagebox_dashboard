import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'border-border bg-background text-foreground placeholder:text-muted min-h-11 w-full border px-3 text-sm',
        'disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed',
        invalid && 'border-triage-red',
        className
      )}
      {...props}
    />
  );
});

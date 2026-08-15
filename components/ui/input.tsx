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
        'bg-surface-input text-foreground rounded-control min-h-11 w-full px-3 text-[0.8125rem] outline-none',
        'focus:ring-accent/50 focus:ring-2 focus:ring-inset',
        'disabled:text-dim',
        invalid && 'ring-triage-red ring-2 ring-inset',
        className
      )}
      {...props}
    />
  );
});

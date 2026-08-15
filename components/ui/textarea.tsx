import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          'bg-surface-input text-foreground rounded-control min-h-20 w-full resize-y px-3 py-2.5 text-[0.8125rem] outline-none',
          'focus:ring-accent/50 focus:ring-2 focus:ring-inset',
          'disabled:text-dim',
          invalid && 'ring-triage-red ring-2 ring-inset',
          className
        )}
        {...props}
      />
    );
  }
);

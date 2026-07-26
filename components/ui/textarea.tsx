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
          'border-border bg-background text-foreground placeholder:text-muted min-h-20 w-full resize-y border px-3 py-2.5 text-sm',
          'disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed',
          invalid && 'border-triage-red',
          className
        )}
        {...props}
      />
    );
  }
);

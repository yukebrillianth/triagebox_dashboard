import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-foreground hover:opacity-90 disabled:bg-surface-muted disabled:text-muted',
  secondary:
    'bg-chip text-foreground hover:bg-control-hover disabled:text-muted',
  ghost:
    'bg-transparent text-foreground hover:bg-control-hover disabled:text-muted',
  danger:
    'bg-triage-red text-white hover:opacity-90 disabled:bg-surface-muted disabled:text-muted',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-[0.8125rem]',
  sm: 'min-h-9 px-3.5 text-xs',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'rounded-control inline-flex items-center justify-center gap-2 font-semibold transition-colors',
          'disabled:opacity-60',
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...props}
      />
    );
  }
);

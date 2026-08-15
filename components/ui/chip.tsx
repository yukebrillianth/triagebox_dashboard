import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Accent color of a chip's active state. */
export type ChipTone = 'accent' | 'red' | 'yellow' | 'green' | 'black';

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: ChipTone;
};

/**
 * Filter chip used by the alert, pasien, and perangkat toolbars. Inactive chips
 * sit on the header surface; active chips take a tinted background and the tone
 * color for text.
 */
const activeClass: Record<ChipTone, string> = {
  accent: 'bg-accent/15 text-accent',
  red: 'bg-triage-red/15 text-triage-red',
  yellow: 'bg-triage-yellow/15 text-triage-yellow',
  green: 'bg-triage-green/15 text-triage-green',
  black: 'bg-triage-black/15 text-triage-black',
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, active = false, tone = 'accent', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      data-active={active ? 'true' : undefined}
      className={cn(
        // Design height is 38px; keep a 44px touch target below `sm`.
        'rounded-control inline-flex h-11 items-center gap-2 px-3.5 text-[0.8125rem] font-semibold transition-colors sm:h-[38px]',
        active
          ? activeClass[tone]
          : 'bg-surface-header text-muted hover:text-foreground',
        className
      )}
      {...props}
    />
  );
});

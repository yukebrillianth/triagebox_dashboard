import { cn } from '@/lib/cn';
import type { Priority } from '@/types';

const LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

/**
 * Tinted pill per the design: tone-colored text on a 12% tint of the same tone.
 * RED takes the lifted ink so the text clears AA on its own tint.
 */
const STYLES: Record<Priority, string> = {
  RED: 'text-triage-red-ink bg-triage-red/12',
  YELLOW: 'text-triage-yellow bg-triage-yellow/12',
  GREEN: 'text-triage-green bg-triage-green/12',
  BLACK: 'text-triage-black bg-triage-black/12',
};

const DOTS: Record<Priority, string> = {
  RED: 'bg-triage-red',
  YELLOW: 'bg-triage-yellow',
  GREEN: 'bg-triage-green',
  BLACK: 'bg-triage-black',
};

type PriorityBadgeProps = {
  /** Nullable: `Victim.currentPriority` is `Priority?`, and a refused model
   *  verdict must not render as BLACK/EXPECTANT. */
  priority: Priority | null | undefined;
  /** Larger variant for the detail header. */
  size?: 'sm' | 'md';
  className?: string;
};

export function PriorityBadge({
  priority,
  size = 'sm',
  className,
}: PriorityBadgeProps) {
  return (
    <span
      data-testid="priority-badge"
      data-priority={priority ?? 'NONE'}
      className={cn(
        'inline-flex items-center gap-[7px] rounded-md font-semibold print:border print:border-black print:bg-transparent print:text-black',
        size === 'sm'
          ? 'px-2.5 py-[3px] text-[0.6875rem]'
          : 'px-3.5 py-1.5 text-[0.8125rem]',
        priority ? STYLES[priority] : 'text-muted bg-surface-muted',
        className
      )}
    >
      <span
        className={cn(
          'inline-block size-2 shrink-0 print:size-2 print:bg-black',
          priority ? DOTS[priority] : 'bg-control-hover'
        )}
        aria-hidden
      />
      {priority ? LABELS[priority] : 'Belum ada'}
    </span>
  );
}

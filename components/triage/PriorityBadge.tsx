import type { Priority } from '@/types';
import { cn } from '@/lib/cn';

const LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const STYLES: Record<Priority, string> = {
  RED: 'bg-triage-red text-white',
  YELLOW: 'bg-triage-yellow text-black',
  GREEN: 'bg-triage-green text-black',
  BLACK: 'bg-triage-black text-white border border-border',
};

type PriorityBadgeProps = {
  priority: Priority;
  className?: string;
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      data-testid="priority-badge"
      data-priority={priority}
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide uppercase',
        STYLES[priority],
        className
      )}
    >
      {LABELS[priority]}
    </span>
  );
}

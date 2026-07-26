import type { Priority } from '@/types';
import { cn } from '@/lib/cn';

const LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const STYLES: Record<Priority, string> = {
  RED: 'text-triage-red border-triage-red',
  YELLOW: 'text-triage-yellow border-triage-yellow',
  GREEN: 'text-triage-green border-triage-green',
  BLACK: 'text-triage-black border-border',
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
        'inline-flex items-center gap-2 border-l-2 px-2 py-1 text-sm font-semibold print:border-black print:text-black',
        STYLES[priority],
        className
      )}
    >
      <span
        className={cn(
          'inline-block size-2.5 shrink-0 print:size-2',
          priority === 'RED' && 'bg-triage-red',
          priority === 'YELLOW' && 'bg-triage-yellow',
          priority === 'GREEN' && 'bg-triage-green',
          priority === 'BLACK' && 'bg-triage-black',
          'print:bg-black'
        )}
        aria-hidden
      />
      {LABELS[priority]}
    </span>
  );
}

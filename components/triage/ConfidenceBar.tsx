import { cn } from '@/lib/cn';

import { formatConfidence, normalizeConfidence } from './formatters';

type ConfidenceBarProps = {
  value?: number | null;
  className?: string;
};

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const pct = normalizeConfidence(value);
  const width = pct ?? 0;

  return (
    <div
      data-testid="confidence-bar"
      className={cn('flex min-w-[4.5rem] flex-col gap-1', className)}
    >
      <span className="text-muted tabular-nums text-[11px] font-medium">
        {formatConfidence(value)}
      </span>
      <div
        className="bg-border h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className="bg-accent h-full rounded-full transition-[width]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

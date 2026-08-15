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
      className={cn('flex min-w-24 flex-col gap-1.5', className)}
    >
      <span className="text-muted font-mono text-xs tabular-nums">
        {formatConfidence(value)}
      </span>
      <div
        className="bg-surface-muted h-1.5 w-full overflow-hidden rounded-full"
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

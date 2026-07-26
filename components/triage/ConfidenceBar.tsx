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
      className={cn('flex min-w-24 flex-col gap-2', className)}
    >
      <span className="text-muted tabular-nums text-sm font-medium">
        {formatConfidence(value)}
      </span>
      <div
        className="bg-border h-2 w-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className="bg-accent h-full transition-[width]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

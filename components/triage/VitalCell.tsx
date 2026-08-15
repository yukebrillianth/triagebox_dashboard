import { cn } from '@/lib/cn';

import { vitalTone, type VitalKind } from './formatters';

type VitalCellProps = {
  label: string;
  value: number | null | undefined;
  unit?: string;
  stale?: boolean;
  /** Applies the design's clinical thresholds for text color. */
  kind?: VitalKind;
  /** Compact table variant: value only, right-aligned, no label. */
  variant?: 'stacked' | 'inline';
  className?: string;
  'data-testid'?: string;
};

export function VitalCell({
  label,
  value,
  unit,
  stale = false,
  kind,
  variant = 'stacked',
  className,
  'data-testid': testId,
}: VitalCellProps) {
  const display = value == null || Number.isNaN(value) ? '-' : String(value);
  const tone = kind ? vitalTone(kind, value) : 'text-foreground';

  if (variant === 'inline') {
    return (
      <span
        data-testid={testId}
        className={cn(
          'block font-mono text-[0.8125rem] font-semibold tabular-nums',
          stale ? 'text-dim' : tone,
          className
        )}
      >
        {display}
        {unit && display !== '-' ? unit : null}
      </span>
    );
  }

  return (
    <div
      data-testid={testId}
      className={cn('flex min-w-0 flex-col gap-1', className)}
    >
      <span className="text-muted text-[0.625rem] font-semibold tracking-[0.06em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-lg leading-none font-semibold tabular-nums',
          stale ? 'text-dim' : tone
        )}
      >
        {display}
        {unit && display !== '-' ? (
          <span className="text-dim ml-1 text-xs font-normal">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}

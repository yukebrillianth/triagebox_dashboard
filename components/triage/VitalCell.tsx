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
  /** Stacked value size: 22px on the detail page, 15px in Command Center. */
  size?: 'md' | 'lg';
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
  size = 'lg',
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
      className={cn(
        'flex min-w-0 flex-col',
        size === 'lg'
          ? 'bg-surface-input rounded-control gap-[5px] px-3.5 py-3'
          : 'gap-0.5',
        className
      )}
    >
      <span className="text-muted text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono leading-none font-semibold tabular-nums',
          size === 'lg' ? 'text-[1.375rem]' : 'text-[0.9375rem]',
          stale ? 'text-dim' : tone
        )}
      >
        {display}
        {unit && display !== '-' ? (
          <span className="text-dim ml-[3px] text-[0.6875rem] font-normal">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

import { cn } from '@/lib/cn';

type VitalCellProps = {
  label: string;
  value: number | null | undefined;
  unit?: string;
  stale?: boolean;
  className?: string;
  'data-testid'?: string;
};

export function VitalCell({
  label,
  value,
  unit,
  stale = false,
  className,
  'data-testid': testId,
}: VitalCellProps) {
  const display = value == null || Number.isNaN(value) ? '-' : String(value);

  return (
    <div
      data-testid={testId}
      className={cn('flex min-w-0 flex-col gap-1', className)}
    >
      <span className="text-muted text-sm font-medium">
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums text-base font-semibold',
          stale ? 'text-muted' : 'text-foreground'
        )}
      >
        {display}
        {unit && display !== '-' ? (
          <span className="text-muted ml-1 text-sm font-normal">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}

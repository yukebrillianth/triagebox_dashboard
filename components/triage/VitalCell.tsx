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
  const display = value == null || Number.isNaN(value) ? '—' : String(value);

  return (
    <div
      data-testid={testId}
      className={cn('flex min-w-0 flex-col gap-0.5', className)}
    >
      <span className="text-muted text-[10px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums text-sm font-semibold',
          stale ? 'text-muted' : 'text-foreground'
        )}
      >
        {display}
        {unit && display !== '—' ? (
          <span className="text-muted ml-0.5 text-xs font-normal">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}

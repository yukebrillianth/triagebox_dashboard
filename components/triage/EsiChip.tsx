import { cn } from '@/lib/cn';

import { asEsi } from './formatters';

type EsiChipProps = {
  /** Raw ESI 1..5 of the reading behind the priority; null = not scored. */
  esi?: number | null;
  className?: string;
};

/**
 * The model's raw ESI, shown beside the triage colour it was collapsed into.
 *
 * Provenance, not severity — hence ConfidenceBar's idiom (mono, tabular, the
 * `surface-muted` track) rather than PriorityBadge's tone tints: the device maps
 * ESI 3, 4 and 5 all to GREEN, so without this a walking-wounded 5 and a
 * could-deteriorate 3 are the same badge. It carries no colour of its own
 * precisely so it cannot be read as a fifth triage level.
 *
 * A null ESI renders "ESI -" in `muted`: the model refused to score. Never 0 —
 * that is the wire's sentinel, not a class the scale has.
 */
export function EsiChip({ esi, className }: EsiChipProps) {
  const e = asEsi(esi);
  return (
    <span
      data-testid="esi-chip"
      data-esi={e ?? 'none'}
      title={
        e == null
          ? 'Model belum memberi skor ESI'
          : 'Skor ESI model: 1 paling gawat, 5 paling ringan'
      }
      className={cn(
        'bg-surface-muted inline-flex items-center rounded-md px-2 py-[2px] font-mono text-[0.625rem] font-semibold tabular-nums',
        e == null ? 'text-muted' : 'text-foreground',
        className
      )}
    >
      {e == null ? 'ESI -' : `ESI ${e}`}
    </span>
  );
}

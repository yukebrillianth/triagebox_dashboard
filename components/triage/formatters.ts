import type { Gender, Priority } from '@/types';

const STALE_THRESHOLD_MS = 45_000;

/** Triage order: the sort order, and the only four valid values. */
export const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

/**
 * `Victim.currentPriority` is `Priority?` in the schema and a `toPriority` from
 * history is a bare string, so narrow before indexing any Record<Priority, …>.
 */
export function asPriority(p: string | null | undefined): Priority | null {
  return p && PRIORITIES.includes(p as Priority) ? (p as Priority) : null;
}

/** Sort rank in triage order; no verdict yet sorts last, not first. */
export function priorityRank(p: Priority | null | undefined): number {
  const i = p ? PRIORITIES.indexOf(p) : -1;
  return i === -1 ? PRIORITIES.length : i;
}

/**
 * Narrow the raw ESI to 1..5 or null: 0 is the wire's "did not score" sentinel
 * and the scale has no class outside 1..5, so both render as not scored rather
 * than as an invented severity. NaN also fails the range test and lands null.
 */
export function asEsi(esi: number | null | undefined): number | null {
  return esi != null && esi >= 1 && esi <= 5 ? esi : null;
}

export function isStale(
  lastUpdate: string | null | undefined,
  thresholdMs = STALE_THRESHOLD_MS,
  now = Date.now()
): boolean {
  if (!lastUpdate) return true;
  const t = Date.parse(lastUpdate);
  if (Number.isNaN(t)) return true;
  return now - t > thresholdMs;
}

export function genderLabel(g: Gender | null | undefined): string {
  if (g === 'M') return 'L';
  if (g === 'F') return 'P';
  return 'Tidak diketahui';
}

export function formatRelativeWib(
  iso: string | null | undefined,
  now = Date.now()
): string {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '-';

  const diffSec = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSec < 5) return 'baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;

  return new Date(t).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Absolute datetime for official reports (WIB). */
export function formatAbsoluteWib(
  isoOrMs: string | number | null | undefined
): string {
  if (isoOrMs == null || isoOrMs === '') return '-';
  const t = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (Number.isNaN(t)) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(t));
}

export function formatBp(sys?: number | null, dia?: number | null): string {
  if (sys == null && dia == null) return '-';
  if (sys == null || dia == null) return '-';
  return `${sys}/${dia}`;
}

/**
 * The four RR bands, keyed by the mid-point the firmware puts on the wire.
 * Pinned to `ui_rr_band_value()` in triagebox-lvgl/ui/logic/ui_types.c — a
 * shipped constant, asserted by scripts/check-triage.ts rather than re-derived.
 */
const RR_BAND_BY_MIDPOINT: Record<number, string> = {
  10: '<12',
  16: '12–20',
  25: '21–30',
  36: '>30',
};

/**
 * RR back as what it is: the band the operator tapped, not a count.
 *
 * The breathing microphone is not fitted, so the operator answers one of four
 * bands on the device and the firmware sends that band's mid-point — the number
 * the triage model was scored on. Printing `16` under an "RR" header would claim
 * a measured rate nobody took, so the mid-point is mapped back to its band.
 *
 * ponytail: an unrecognised value falls through as the number, which is what a
 * real microphone would send. When that PCB ships, drop this and render the
 * number directly — and change the label away from "(operator)".
 */
export function rrBandLabel(rr?: number | null): string | null {
  if (rr == null || Number.isNaN(rr)) return null;
  return RR_BAND_BY_MIDPOINT[rr] ?? String(rr);
}

/** Normalize 0–1 or 0–100 confidence to 0–100 percent number. */
export function normalizeConfidence(c?: number | null): number | null {
  if (c == null || Number.isNaN(c)) return null;
  const n = c > 1 ? c : c * 100;
  return Math.max(0, Math.min(100, n));
}

export function formatConfidence(c?: number | null): string {
  const pct = normalizeConfidence(c);
  if (pct == null) return '-';
  return `${Math.round(pct)}%`;
}

/**
 * Tailwind text color for a vital. HR and battery use the design's severity
 * cutoffs. SpO2 deliberately has none: the curve is an uncalibrated 110−25R
 * with R sitting at its clamp and no paired-oximeter test, so escalating to red
 * would assert a saturation the hardware cannot measure. It is labelled
 * "SpO2 (tren)" and rendered in the neutral foreground color.
 */
export type VitalKind = 'spo2' | 'hr' | 'battery';

const VITAL_THRESHOLDS: Record<
  Exclude<VitalKind, 'spo2'>,
  { bad: (v: number) => boolean; warn: (v: number) => boolean }
> = {
  hr: { bad: (v) => v > 120 || v < 50, warn: (v) => v > 100 },
  battery: { bad: (v) => v <= 20, warn: (v) => v <= 40 },
};

export function vitalTone(
  kind: VitalKind,
  value: number | null | undefined
): string {
  if (value == null || Number.isNaN(value)) return 'text-dim';
  if (kind === 'spo2') return 'text-foreground';
  const { bad, warn } = VITAL_THRESHOLDS[kind];
  if (bad(value)) return 'text-triage-red-ink';
  if (warn(value)) return 'text-triage-yellow';
  return kind === 'battery' ? 'text-triage-green' : 'text-foreground';
}

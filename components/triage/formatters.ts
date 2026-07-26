import type { Gender } from '@/types';

const STALE_THRESHOLD_MS = 45_000;

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

export function ageRangeLabel(age: number | null | undefined): string | null {
  if (age == null || Number.isNaN(age) || age < 0) return null;
  if (age < 1) return 'Bayi';
  if (age <= 12) return 'Anak';
  if (age <= 17) return 'Remaja';
  if (age <= 59) return 'Dewasa';
  return 'Lansia';
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

export function formatBp(
  sys?: number | null,
  dia?: number | null
): string {
  if (sys == null && dia == null) return '-';
  if (sys == null || dia == null) return '-';
  return `${sys}/${dia}`;
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

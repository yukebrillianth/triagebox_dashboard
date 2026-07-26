'use client';

import { useState, type ReactNode } from 'react';

import {
  EmptyState,
  PriorityBadge,
  formatAbsoluteWib,
  formatRelativeWib,
} from '@/components/triage';
import { useReport, useSettings } from '@/hooks/use-api';
import { cn } from '@/lib/cn';
import type { Activity, Priority, PriorityCounts, Victim } from '@/types';

const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

const PRIORITY_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

function asPriority(p: string | null | undefined): Priority | null {
  if (!p) return null;
  return PRIORITIES.includes(p as Priority) ? (p as Priority) : null;
}

function parseCounts(counts: unknown): {
  total: number;
  byPriority: Partial<PriorityCounts>;
} {
  if (!counts || typeof counts !== 'object') {
    return { total: 0, byPriority: {} };
  }
  const c = counts as Record<string, unknown>;
  if (c.byPriority && typeof c.byPriority === 'object') {
    const by = c.byPriority as Partial<PriorityCounts>;
    const total =
      typeof c.total === 'number'
        ? c.total
        : PRIORITIES.reduce((s, k) => s + (by[k] ?? 0), 0);
    return { total, byPriority: by };
  }
  // flat PriorityCounts shape
  const by: Partial<PriorityCounts> = {};
  for (const k of PRIORITIES) {
    if (typeof c[k] === 'number') by[k] = c[k] as number;
  }
  const total = PRIORITIES.reduce((s, k) => s + (by[k] ?? 0), 0);
  return { total, byPriority: by };
}

function blank(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : '-';
}

function Section({
  title,
  testId,
  children,
  className,
}: {
  title: string;
  testId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'border-border bg-card border p-4 print:border-black print:bg-white print:p-0 print:pt-3',
        className
      )}
    >
      <h2 className="text-foreground border-border border-b pb-2 text-sm font-semibold tracking-tight print:border-black print:pb-1 print:text-base print:text-black">
        {title}
      </h2>
      <div className="mt-3 print:mt-2">{children}</div>
    </section>
  );
}

export function ReportContainer() {
  const { data, isLoading, isError, error, refetch, isFetching } = useReport();
  const { data: settings } = useSettings();

  const victims: Victim[] = data?.victims ?? [];
  const { total, byPriority } = parseCounts(data?.counts);
  const triageCount = data?.triageHistoryCount ?? 0;
  const timeline: Activity[] =
    data?.activityTimeline ?? data?.recentActivity ?? [];

  const hospital = blank(settings?.hospital_name);
  const disaster = blank(settings?.disaster_name);
  const operator = blank(settings?.operator);
  const [generatedAt] = useState(() => formatAbsoluteWib(Date.now()));

  if (isLoading && !data) {
    return (
      <div data-testid="page-report" className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              Laporan Triase
            </h1>
            <p className="text-muted mt-1 text-sm">Memuat ringkasan...</p>
          </div>
        </header>
        <div className="border-border bg-card h-40 animate-pulse border" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-report" className="space-y-6">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Laporan Triase
          </h1>
        </header>
        <EmptyState
          title="Gagal memuat laporan"
          description={
            error instanceof Error
              ? error.message
              : 'Tidak dapat mengambil ringkasan laporan.'
          }
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="bg-accent text-accent-foreground rounded-sm px-3 py-1.5 text-xs font-semibold"
            >
              Coba lagi
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid="page-report"
      className="space-y-6 print:space-y-4 print:!bg-white print:!text-black"
    >
      {/* Screen toolbar */}
      <header className="print:hidden flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Laporan Triase
          </h1>
          <p className="text-muted mt-1 text-sm">
            Ringkasan korban, jumlah prioritas, riwayat triase, dan aktivitas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="border-border text-muted hover:text-foreground hover:bg-surface-muted rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isFetching ? 'Memuat...' : 'Muat ulang'}
          </button>
          <button
            type="button"
            data-testid="btn-print"
            onClick={() => window.print()}
            className="bg-accent text-accent-foreground hover:opacity-90 rounded-sm px-3 py-1.5 text-xs font-semibold transition-opacity"
          >
            Cetak PDF
          </button>
        </div>
      </header>

      {/* Official document header (print + screen) */}
      <header className="border-border bg-card border p-4 print:border-0 print:border-b print:border-black print:bg-white print:p-0 print:pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted text-xs font-medium print:text-neutral-700">
              TriageBox
            </p>
            <h1 className="text-foreground mt-1 text-lg font-semibold tracking-tight print:mt-0.5 print:text-xl print:text-black">
              Laporan Resmi Triase
            </h1>
          </div>
          <div className="text-muted text-xs print:text-right print:text-neutral-700 sm:text-right">
            <p>
              Dicetak:{' '}
              <span className="text-foreground font-mono tabular-nums print:text-black">
                {generatedAt} WIB
              </span>
            </p>
          </div>
        </div>

        <dl className="border-border mt-4 grid gap-2 border-t pt-4 text-sm print:mt-3 print:border-black print:pt-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted w-28 shrink-0 print:text-neutral-700">
              Rumah sakit
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {hospital}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-28 shrink-0 print:text-neutral-700">
              Bencana
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {disaster}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-28 shrink-0 print:text-neutral-700">
              Operator
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {operator}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-28 shrink-0 print:text-neutral-700">
              Waktu cetak
            </dt>
            <dd className="text-foreground font-mono text-xs tabular-nums print:text-black sm:text-sm">
              {generatedAt} WIB
            </dd>
          </div>
        </dl>
      </header>

      {/* Counts summary: plain markers, not chips */}
      <Section title="Ringkasan Jumlah" className="print:break-inside-avoid">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
          <div>
            <p className="text-muted text-xs print:text-neutral-700">Total</p>
            <p
              data-testid="report-total"
              className="text-foreground mt-1 font-mono text-2xl font-semibold tabular-nums print:text-xl print:text-black"
            >
              {total || victims.length}
            </p>
          </div>
          {PRIORITIES.map((p) => (
            <div key={p}>
              <p className="text-muted flex items-center gap-1.5 text-xs print:text-neutral-700">
                <span
                  className={cn(
                    'inline-block size-2 shrink-0 print:bg-black',
                    p === 'RED' && 'bg-triage-red',
                    p === 'YELLOW' && 'bg-triage-yellow',
                    p === 'GREEN' && 'bg-triage-green',
                    p === 'BLACK' && 'bg-triage-black'
                  )}
                  aria-hidden
                />
                {PRIORITY_LABELS[p]}
              </p>
              <p
                data-testid={`report-count-${p.toLowerCase()}`}
                className={cn(
                  'mt-1 font-mono text-2xl font-semibold tabular-nums print:text-xl print:text-black',
                  p === 'RED' && 'text-triage-red',
                  p === 'YELLOW' && 'text-triage-yellow',
                  p === 'GREEN' && 'text-triage-green',
                  p === 'BLACK' && 'text-foreground'
                )}
              >
                {byPriority[p] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Daftar Korban" testId="report-victims">
        {victims.length === 0 ? (
          <EmptyState
            title="Belum ada korban"
            description="Data korban akan muncul setelah node melaporkan triase."
            className="py-8 print:py-4"
          />
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table
              data-testid="report-victims-table"
              className="w-full min-w-[640px] border-collapse text-left text-sm print:min-w-0"
            >
              <thead>
                <tr className="border-border text-muted border-b text-xs font-medium print:border-black print:bg-neutral-100 print:text-black">
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    RFID
                  </th>
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    Nama
                  </th>
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    Usia
                  </th>
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    Prioritas
                  </th>
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    Node
                  </th>
                  <th className="px-2 py-2.5 font-medium print:border print:border-black print:px-1.5 print:py-1.5">
                    Pembaruan
                  </th>
                </tr>
              </thead>
              <tbody>
                {victims.map((v) => {
                  const pr = asPriority(v.currentPriority);
                  return (
                    <tr
                      key={v.id}
                      data-testid={`report-victim-${v.id}`}
                      className="border-border border-b last:border-0 print:border-black"
                    >
                      <td className="text-foreground px-2 py-2 font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.rfid}
                      </td>
                      <td className="text-foreground px-2 py-2 print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.name?.trim() ? v.name : '-'}
                      </td>
                      <td className="text-muted px-2 py-2 font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.age != null ? v.age : '-'}
                      </td>
                      <td className="px-2 py-2 print:border print:border-black print:px-1.5 print:py-1">
                        {pr ? (
                          <PriorityBadge priority={pr} />
                        ) : (
                          <span className="text-muted text-xs print:text-black">
                            -
                          </span>
                        )}
                      </td>
                      <td className="text-muted px-2 py-2 font-mono text-xs print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.currentNodeId ?? '-'}
                      </td>
                      <td className="text-muted px-2 py-2 text-xs print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {formatRelativeWib(v.lastUpdate ?? v.lastSeen)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2 print:gap-4">
        <Section
          title="Ringkasan Riwayat Triase"
          testId="report-triage-summary"
          className="print:break-inside-avoid"
        >
          <p className="text-foreground text-sm print:text-black">
            Total perubahan prioritas:{' '}
            <span
              data-testid="report-triage-count"
              className="font-mono font-semibold tabular-nums"
            >
              {triageCount}
            </span>
          </p>
          <p className="text-muted mt-2 text-xs print:text-neutral-700">
            Dihitung dari seluruh entri riwayat triase di backend.
          </p>
        </Section>

        <Section title="Timeline Aktivitas" testId="report-activity">
          {timeline.length === 0 ? (
            <p className="text-muted text-xs print:text-neutral-700">
              Belum ada aktivitas.
            </p>
          ) : (
            <ul className="max-h-72 space-y-3 overflow-y-auto print:max-h-none print:space-y-2 print:overflow-visible">
              {timeline.map((a) => (
                <li
                  key={a.id}
                  data-testid={`report-activity-${a.id}`}
                  className="border-border border-b pb-3 last:border-0 last:pb-0 print:border-black print:pb-2"
                >
                  <p className="text-foreground text-xs leading-snug print:text-black">
                    {a.message}
                  </p>
                  <p className="text-muted mt-1 text-[11px] print:text-neutral-700">
                    <span className="font-mono">{a.type}</span>
                    <span className="mx-1 opacity-40">·</span>
                    {formatRelativeWib(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

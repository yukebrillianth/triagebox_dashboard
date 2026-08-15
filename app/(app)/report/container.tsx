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
        'bg-card rounded-card p-[22px] print:rounded-none print:border-black print:bg-white print:p-0 print:pt-3',
        className
      )}
    >
      <h2 className="text-foreground border-border border-b pb-3 text-sm font-semibold print:border-black print:pb-1 print:text-base print:text-black">
        {title}
      </h2>
      <div className="mt-4 print:mt-2">{children}</div>
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
      <div data-testid="page-report" className="space-y-3.5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
              Laporan Triase
            </h1>
            <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
              Memuat ringkasan...
            </p>
          </div>
        </header>
        <div className="bg-card rounded-card h-40 animate-pulse" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-report" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
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
              className="bg-accent text-accent-foreground rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold"
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
      className="space-y-3.5 print:space-y-4 print:!bg-white print:!text-black"
    >
      {/* Screen toolbar */}
      <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Laporan Triase
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Ringkasan korban, jumlah prioritas, riwayat triase, dan aktivitas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="bg-chip text-foreground-soft hover:text-accent rounded-control h-11 px-4 text-[0.8125rem] font-medium transition-colors disabled:opacity-50 sm:h-[38px]"
          >
            {isFetching ? 'Memuat...' : 'Muat ulang'}
          </button>
          <button
            type="button"
            data-testid="btn-print"
            onClick={() => window.print()}
            className="bg-accent text-accent-foreground rounded-control h-11 px-4 text-[0.8125rem] font-semibold transition-opacity hover:opacity-90 sm:h-[38px]"
          >
            Cetak PDF
          </button>
        </div>
      </header>

      {/* Official document header (print + screen) */}
      <header className="bg-card rounded-card p-[22px] print:rounded-none print:border-0 print:border-b print:border-black print:bg-white print:p-0 print:pb-3">
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-[18px] print:border-black print:pb-2">
          <div className="min-w-0">
            <span className="text-muted text-[0.6875rem] font-semibold tracking-[0.14em] uppercase print:text-neutral-700">
              TriageBox
            </span>
            <h2 className="text-foreground mt-1 text-[1.1875rem] font-semibold tracking-tight print:mt-0.5 print:text-xl print:text-black">
              Laporan Resmi Triase
            </h2>
          </div>
          <span className="text-muted font-mono text-xs tabular-nums print:text-neutral-700">
            Dicetak: {generatedAt} WIB
          </span>
        </div>

        <dl className="mt-[18px] grid gap-3 text-[0.8125rem] sm:grid-cols-2 sm:gap-x-10 print:mt-3">
          <div className="flex gap-4">
            <dt className="text-muted w-32 shrink-0 print:text-neutral-700">
              Rumah sakit
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {hospital}
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted w-32 shrink-0 print:text-neutral-700">
              Bencana
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {disaster}
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted w-32 shrink-0 print:text-neutral-700">
              Operator
            </dt>
            <dd className="text-foreground font-medium print:text-black">
              {operator}
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted w-32 shrink-0 print:text-neutral-700">
              Waktu cetak
            </dt>
            <dd className="text-foreground font-mono text-xs tabular-nums print:text-black">
              {generatedAt} WIB
            </dd>
          </div>
        </dl>
      </header>

      {/* Counts summary: plain markers, not chips */}
      <Section title="Ringkasan Jumlah" className="print:break-inside-avoid">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-xs print:text-neutral-700">
              Total
            </span>
            <span
              data-testid="report-total"
              className="text-foreground font-mono text-[1.375rem] leading-none font-semibold tabular-nums print:text-xl print:text-black"
            >
              {total || victims.length}
            </span>
          </div>
          {PRIORITIES.map((p) => (
            <div key={p} className="flex flex-col gap-1.5">
              <span className="text-muted flex items-center gap-[7px] text-xs print:text-neutral-700">
                <span
                  className={cn(
                    'inline-block size-2 shrink-0 rounded-full print:bg-black',
                    p === 'RED' && 'bg-triage-red',
                    p === 'YELLOW' && 'bg-triage-yellow',
                    p === 'GREEN' && 'bg-triage-green',
                    p === 'BLACK' && 'bg-triage-black'
                  )}
                  aria-hidden
                />
                {PRIORITY_LABELS[p]}
              </span>
              <span
                data-testid={`report-count-${p.toLowerCase()}`}
                className={cn(
                  'font-mono text-[1.375rem] leading-none font-semibold tabular-nums print:text-xl print:text-black',
                  p === 'RED' && 'text-triage-red-ink',
                  p === 'YELLOW' && 'text-triage-yellow',
                  p === 'GREEN' && 'text-triage-green',
                  p === 'BLACK' && 'text-foreground'
                )}
              >
                {byPriority[p] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Bleeds the table head to the card edges, like the design. */}
      <section
        data-testid="report-victims"
        className="bg-card rounded-card overflow-hidden print:rounded-none print:bg-white print:pt-3"
      >
        <h2 className="text-foreground px-[22px] pt-5 pb-3.5 text-sm font-semibold print:px-0 print:pt-0 print:text-base print:text-black">
          Daftar Korban
        </h2>
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
              className="w-full min-w-[680px] border-collapse text-left print:min-w-0"
            >
              <thead className="bg-surface-header print:bg-neutral-100">
                <tr className="text-muted text-[0.6875rem] font-semibold tracking-[0.06em] uppercase print:border-black print:text-black">
                  <th className="w-[108px] px-[22px] py-2.5 font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
                    RFID
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
                    Nama
                  </th>
                  <th className="w-[62px] px-3.5 py-2.5 text-right font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
                    Usia
                  </th>
                  <th className="w-32 px-3.5 py-2.5 font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
                    Prioritas
                  </th>
                  <th className="w-[116px] px-3.5 py-2.5 font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
                    Node
                  </th>
                  <th className="w-32 px-[22px] py-2.5 text-right font-semibold print:border print:border-black print:px-1.5 print:py-1.5">
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
                      <td className="text-foreground px-[22px] py-2.5 font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.rfid}
                      </td>
                      <td className="text-foreground px-3.5 py-2.5 text-[0.8125rem] print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.name?.trim() ? v.name : '-'}
                      </td>
                      <td className="text-foreground-soft px-3.5 py-2.5 text-right font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.age != null ? v.age : '-'}
                      </td>
                      <td className="px-3.5 py-2.5 print:border print:border-black print:px-1.5 print:py-1">
                        {pr ? (
                          <PriorityBadge priority={pr} />
                        ) : (
                          <span className="text-muted text-xs print:text-black">
                            -
                          </span>
                        )}
                      </td>
                      <td className="text-muted px-3.5 py-2.5 font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {v.currentNodeId ?? '-'}
                      </td>
                      <td className="text-muted px-[22px] py-2.5 text-right font-mono text-xs tabular-nums print:border print:border-black print:px-1.5 print:py-1 print:text-black">
                        {formatRelativeWib(v.lastUpdate ?? v.lastSeen)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid items-start gap-3.5 md:grid-cols-2 print:grid-cols-2 print:gap-4">
        <Section
          title="Ringkasan Riwayat Triase"
          testId="report-triage-summary"
          className="print:break-inside-avoid"
        >
          <p className="text-foreground text-[0.8125rem] print:text-black">
            Total perubahan prioritas:{' '}
            <span
              data-testid="report-triage-count"
              className="font-mono font-semibold tabular-nums"
            >
              {triageCount}
            </span>
          </p>
          <p className="text-muted mt-2.5 text-xs print:text-neutral-700">
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
                  <p className="text-foreground text-[0.8125rem] leading-snug print:text-black">
                    {a.message}
                  </p>
                  <p className="text-muted mt-1 text-[0.6875rem] print:text-neutral-700">
                    <span className="font-mono">{a.type}</span>
                    <span className="mx-1">·</span>
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

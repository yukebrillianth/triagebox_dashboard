'use client';

import type { ReactNode } from 'react';

import { EmptyState, PriorityBadge, formatRelativeWib } from '@/components/triage';
import { useReport } from '@/hooks/use-api';
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

function Panel({
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
        'border-border bg-card rounded-md border p-3 print:border-black print:bg-white',
        className
      )}
    >
      <h2 className="text-foreground text-sm font-semibold tracking-tight print:text-black">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function ReportContainer() {
  const { data, isLoading, isError, error, refetch, isFetching } = useReport();

  const victims: Victim[] = data?.victims ?? [];
  const { total, byPriority } = parseCounts(data?.counts);
  const triageCount = data?.triageHistoryCount ?? 0;
  const timeline: Activity[] =
    data?.activityTimeline ?? data?.recentActivity ?? [];

  if (isLoading && !data) {
    return (
      <div data-testid="page-report" className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              Laporan
            </h1>
            <p className="text-muted mt-1 text-sm">Memuat ringkasan…</p>
          </div>
        </header>
        <div className="border-border bg-card h-40 animate-pulse rounded-md border" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-report" className="space-y-4">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Laporan
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
              className="bg-accent text-background rounded-sm px-3 py-1.5 text-xs font-semibold"
            >
              Coba lagi
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="page-report" className="space-y-4 print:space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight print:text-black">
            Laporan Triase
          </h1>
          <p className="text-muted mt-1 text-sm print:text-neutral-700">
            Ringkasan korban, counts, riwayat triase, dan aktivitas.
          </p>
        </div>
        <div className="print:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="border-border text-muted hover:text-foreground hover:bg-background rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isFetching ? 'Memuat…' : 'Muat ulang'}
          </button>
          <button
            type="button"
            data-testid="btn-print"
            onClick={() => window.print()}
            className="bg-accent text-background hover:bg-accent/90 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Cetak PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="border-border bg-card rounded-md border px-3 py-3 print:border-black print:bg-white">
          <p className="text-muted text-[11px] font-medium tracking-wider uppercase print:text-neutral-600">
            Total
          </p>
          <p
            data-testid="report-total"
            className="text-foreground mt-1 font-mono text-2xl font-semibold tabular-nums print:text-black"
          >
            {total || victims.length}
          </p>
        </div>
        {PRIORITIES.map((p) => (
          <div
            key={p}
            className="border-border bg-card rounded-md border px-3 py-3 print:border-black print:bg-white"
          >
            <p className="text-muted text-[11px] font-medium tracking-wider uppercase print:text-neutral-600">
              {PRIORITY_LABELS[p]}
            </p>
            <p
              data-testid={`report-count-${p.toLowerCase()}`}
              className={cn(
                'mt-1 font-mono text-2xl font-semibold tabular-nums',
                p === 'RED' && 'text-triage-red',
                p === 'YELLOW' && 'text-triage-yellow',
                p === 'GREEN' && 'text-triage-green',
                p === 'BLACK' && 'text-foreground print:text-black'
              )}
            >
              {byPriority[p] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <Panel title="Daftar Korban" testId="report-victims">
        {victims.length === 0 ? (
          <EmptyState
            title="Belum ada korban"
            description="Data korban akan muncul setelah node melaporkan triase."
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid="report-victims-table"
              className="w-full min-w-[640px] border-collapse text-left text-sm"
            >
              <thead>
                <tr className="border-border text-muted border-b text-[11px] font-medium tracking-wider uppercase print:border-black print:text-neutral-600">
                  <th className="px-2 py-2 font-medium">RFID</th>
                  <th className="px-2 py-2 font-medium">Nama</th>
                  <th className="px-2 py-2 font-medium">Usia</th>
                  <th className="px-2 py-2 font-medium">Prioritas</th>
                  <th className="px-2 py-2 font-medium">Node</th>
                  <th className="px-2 py-2 font-medium">Update</th>
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
                      <td className="text-foreground px-2 py-1.5 font-mono text-xs tabular-nums print:text-black">
                        {v.rfid}
                      </td>
                      <td className="text-foreground px-2 py-1.5 print:text-black">
                        {v.name?.trim() ? v.name : '—'}
                      </td>
                      <td className="text-muted px-2 py-1.5 font-mono text-xs tabular-nums print:text-neutral-700">
                        {v.age != null ? v.age : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        {pr ? (
                          <PriorityBadge priority={pr} />
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="text-muted px-2 py-1.5 font-mono text-xs print:text-neutral-700">
                        {v.currentNodeId ?? '—'}
                      </td>
                      <td className="text-muted px-2 py-1.5 text-xs print:text-neutral-700">
                        {formatRelativeWib(v.lastUpdate ?? v.lastSeen)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Ringkasan Riwayat Triase" testId="report-triage-summary">
          <p className="text-foreground text-sm print:text-black">
            Total perubahan prioritas:{' '}
            <span
              data-testid="report-triage-count"
              className="font-mono font-semibold tabular-nums"
            >
              {triageCount}
            </span>
          </p>
          <p className="text-muted mt-1 text-xs print:text-neutral-600">
            Dihitung dari seluruh entri triage history di backend.
          </p>
        </Panel>

        <Panel title="Timeline Aktivitas" testId="report-activity">
          {timeline.length === 0 ? (
            <p className="text-muted text-xs print:text-neutral-600">
              Belum ada aktivitas.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto print:max-h-none">
              {timeline.map((a) => (
                <li
                  key={a.id}
                  data-testid={`report-activity-${a.id}`}
                  className="border-border border-b pb-2 last:border-0 last:pb-0 print:border-black"
                >
                  <p className="text-foreground text-xs leading-snug print:text-black">
                    {a.message}
                  </p>
                  <p className="text-muted mt-0.5 text-[11px] print:text-neutral-600">
                    <span className="font-mono">{a.type}</span>
                    <span className="mx-1 opacity-40">·</span>
                    {formatRelativeWib(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

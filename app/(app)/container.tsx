'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { TriangleAlert } from 'lucide-react';
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { EmptyState, formatRelativeWib } from '@/components/triage';
import { useActivity, useAlerts, useKpis, useNodes } from '@/hooks/use-api';
import { useRealtime } from '@/hooks/use-realtime';
import { cn } from '@/lib/cn';
import type { Priority } from '@/types';

const TRIAGE_COLORS: Record<Priority, string> = {
  RED: 'var(--triage-red)',
  YELLOW: 'var(--triage-yellow)',
  GREEN: 'var(--triage-green)',
  BLACK: 'var(--triage-black)',
};

const TRIAGE_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const TRIAGE_TEXT: Record<Priority, string> = {
  RED: 'text-triage-red',
  YELLOW: 'text-triage-yellow',
  GREEN: 'text-triage-green',
  BLACK: 'text-triage-black',
};

const TRIAGE_DOT: Record<Priority, string> = {
  RED: 'bg-triage-red',
  YELLOW: 'bg-triage-yellow',
  GREEN: 'bg-triage-green',
  BLACK: 'bg-triage-black',
};

const KPI_TEST_IDS: Record<Priority, string> = {
  RED: 'kpi-red',
  YELLOW: 'kpi-yellow',
  GREEN: 'kpi-green',
  BLACK: 'kpi-black',
};

const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

const LOW_BATTERY_PCT = 20;

function formatWibClock(ts: number | null): string {
  if (ts == null) return '-';
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function formatPct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${pct(part, total).toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;
}

function TriageTile({
  priority,
  count,
  total,
}: {
  priority: Priority;
  count: number;
  total: number;
}) {
  return (
    <div
      className={cn(
        'rounded-card flex flex-col justify-center gap-3 px-4 py-4 sm:px-[18px]',
        // Design tints the RED tile instead of using the flat card surface.
        priority === 'RED' ? 'bg-triage-red/[0.09]' : 'bg-card'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn('inline-block size-2 shrink-0', TRIAGE_DOT[priority])}
          aria-hidden
        />
        <span className="text-muted truncate text-[0.8125rem] font-medium">
          {TRIAGE_LABELS[priority]}
        </span>
      </div>
      <span
        data-testid={KPI_TEST_IDS[priority]}
        className={cn(
          'font-mono text-[2.25rem] leading-none font-semibold tracking-tight tabular-nums',
          TRIAGE_TEXT[priority]
        )}
      >
        {count}
      </span>
      <span className="text-dim text-[0.6875rem] tabular-nums">
        {formatPct(count, total)} dari total
      </span>
    </div>
  );
}

function PageHeader({ clock }: { clock: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Beranda
        </h1>
        <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
          Ringkasan triase realtime
        </p>
      </div>
      <p data-testid="last-update" className="text-dim text-xs tabular-nums">
        Update: {clock} WIB
      </p>
    </header>
  );
}

function HeroCard({
  total,
  byPriority,
}: {
  total: number;
  byPriority: Record<Priority, number>;
}) {
  const segments = PRIORITIES.filter((p) => byPriority[p] > 0);

  return (
    <div className="bg-card rounded-card flex flex-col justify-between gap-4 px-[18px] py-4 sm:px-[22px]">
      <div>
        <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">
          Total Korban
        </p>
        <p className="text-dim mt-0.5 text-[0.8125rem]">
          Aktif di seluruh node lapangan
        </p>
      </div>

      <p
        data-testid="kpi-total"
        className="text-foreground font-mono text-[3.25rem] leading-[0.85] font-semibold tracking-[-0.05em] tabular-nums sm:text-[4.25rem]"
      >
        {total}
      </p>

      <div>
        <div
          className="bg-surface-muted flex h-[7px] gap-0.5 overflow-hidden rounded-sm"
          role="img"
          aria-label={PRIORITIES.map(
            (p) => `${TRIAGE_LABELS[p]} ${byPriority[p]}`
          ).join(', ')}
        >
          {segments.map((p) => (
            <span
              key={p}
              className={TRIAGE_DOT[p]}
              style={{ width: `${pct(byPriority[p], total)}%` }}
            />
          ))}
        </div>
        <p className="text-dim mt-1.5 text-[0.6875rem]">
          Proporsi triase saat ini
        </p>
      </div>
    </div>
  );
}

function DonutCard({
  total,
  byPriority,
}: {
  total: number;
  byPriority: Record<Priority, number>;
}) {
  const data = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        key: p,
        name: TRIAGE_LABELS[p],
        value: byPriority[p] ?? 0,
        // Recharts reads `fill` off each datum; <Cell> is deprecated in v3.
        fill: TRIAGE_COLORS[p],
      })).filter((d) => d.value > 0),
    [byPriority]
  );

  return (
    <section className="bg-card rounded-card flex flex-col gap-4 px-[18px] py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-foreground text-[0.9375rem] font-semibold">
          Distribusi Triase
        </h2>
        <span className="text-dim text-[0.6875rem]">
          Arahkan kursor untuk detail
        </span>
      </div>

      {data.length === 0 ? (
        <p
          data-testid="triage-donut"
          className="text-muted flex min-h-32 items-center justify-center text-sm"
        >
          Tidak ada data
        </p>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <div
            data-testid="triage-donut"
            className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={1.5}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-header)',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--foreground)',
                  }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [String(value ?? 0), 'Jumlah']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-foreground font-mono text-[2rem] leading-none font-semibold tracking-tight tabular-nums">
                {total}
              </span>
              <span className="text-dim text-[0.6875rem]">korban aktif</span>
            </div>
          </div>

          <ul className="w-full flex-1">
            {PRIORITIES.map((p) => (
              <li
                key={p}
                className="border-border flex items-center gap-3 border-b py-[7px] last:border-b-0"
              >
                <span
                  className={cn(
                    'inline-block size-2.5 shrink-0',
                    TRIAGE_DOT[p]
                  )}
                  aria-hidden
                />
                <span className="text-muted min-w-0 flex-1 truncate text-[0.8125rem]">
                  {TRIAGE_LABELS[p]}
                </span>
                <span className="text-muted font-mono text-xs tabular-nums">
                  {byPriority[p] ?? 0}
                </span>
                <span
                  className={cn(
                    'w-14 text-right font-mono text-[0.8125rem] font-semibold tabular-nums',
                    TRIAGE_TEXT[p]
                  )}
                >
                  {formatPct(byPriority[p] ?? 0, total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActivityCard({
  items,
  loading,
  now,
}: {
  items: { id: string; message: string; createdAt: string }[] | undefined;
  loading: boolean;
  now: number;
}) {
  return (
    <section className="bg-card rounded-card flex flex-col gap-3 px-[18px] py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-foreground text-[0.9375rem] font-semibold">
          Aktivitas Terbaru
        </h2>
        <span className="text-dim text-[0.6875rem] tabular-nums">
          {items?.length ?? 0} kejadian
        </span>
      </div>

      <ul
        data-testid="activity-feed"
        className="max-h-64 flex-1 overflow-y-auto"
      >
        {loading && !items ? (
          <li className="text-muted py-8 text-center text-sm">
            Memuat aktivitas…
          </li>
        ) : !items || items.length === 0 ? (
          <li className="text-muted py-8 text-center text-sm">
            Belum ada aktivitas
          </li>
        ) : (
          items.slice(0, 20).map((item) => (
            <li
              key={item.id}
              data-testid="activity-item"
              className="border-border flex gap-3 border-b py-[9px] last:border-b-0"
            >
              <span
                className="bg-accent mt-[5px] inline-block size-[7px] shrink-0 rounded-full"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs leading-snug">
                  {item.message}
                </p>
                <p className="text-dim mt-0.5 font-mono text-[0.6875rem] tabular-nums">
                  {formatRelativeWib(item.createdAt, now)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function NodeSummary({
  onlineNodes,
  totalNodes,
  offlineIds,
  lowBattery,
}: {
  onlineNodes: number;
  totalNodes: number;
  offlineIds: string[];
  lowBattery: { id: string; battery: number } | null;
}) {
  return (
    <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      <div className="bg-card rounded-card flex flex-col gap-3 px-[18px] py-[18px] sm:px-[22px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted text-[0.8125rem]">Node online</span>
          <span className="text-triage-green font-mono text-[1.625rem] leading-none font-semibold tabular-nums">
            <span data-testid="nodes-online">{onlineNodes}</span>
            <span className="text-dim text-sm">
              /<span data-testid="nodes-total">{totalNodes}</span>
            </span>
          </span>
        </div>
        <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${pct(onlineNodes, totalNodes)}%` }}
          />
        </div>
        <span className="text-dim text-[0.6875rem]">
          {formatPct(onlineNodes, totalNodes)} node melapor terakhir kali
        </span>
      </div>

      <div className="bg-card rounded-card flex flex-col gap-3 px-[18px] py-[18px] sm:px-[22px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted text-[0.8125rem]">Node offline</span>
          <span
            data-testid="nodes-offline"
            className="text-triage-red font-mono text-[1.625rem] leading-none font-semibold tabular-nums"
          >
            {Math.max(0, totalNodes - onlineNodes)}
          </span>
        </div>
        {offlineIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {offlineIds.slice(0, 6).map((id) => (
              <span
                key={id}
                className="bg-chip text-muted rounded px-2 py-1 font-mono text-[0.6875rem] tabular-nums"
              >
                {id}
              </span>
            ))}
            {offlineIds.length > 6 ? (
              <span className="text-dim px-1 py-1 text-[0.6875rem]">
                +{offlineIds.length - 6} lain
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-dim text-[0.6875rem]">Semua node melapor</span>
        )}
        {lowBattery ? (
          <span className="text-dim text-[0.6875rem]">
            Baterai {lowBattery.id} tinggal {lowBattery.battery}%
          </span>
        ) : null}
      </div>

      <div className="bg-card rounded-card flex flex-col gap-3 px-[18px] py-[18px] sm:col-span-2 sm:px-[22px] xl:col-span-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted text-[0.8125rem]">
            Pembaruan terakhir
          </span>
          <span className="bg-accent/12 text-accent rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold">
            Realtime
          </span>
        </div>
        <ConnectionSummary />
      </div>
    </section>
  );
}

function ConnectionSummary() {
  const { connectionStatus, lastBootstrapAt } = useRealtime();
  const label =
    connectionStatus === 'connected'
      ? 'Socket.IO tersambung'
      : connectionStatus === 'connecting'
        ? 'Menghubungkan ke backend…'
        : 'Terputus dari backend';

  return (
    <>
      <p className="text-foreground font-mono text-[1.625rem] leading-none font-semibold tracking-tight tabular-nums">
        {formatWibClock(lastBootstrapAt)} WIB
      </p>
      <p className="text-dim text-[0.6875rem]">{label}</p>
    </>
  );
}

export function BerandaContainer() {
  const { data: kpi, isLoading: kpiLoading, isError: kpiError } = useKpis();
  const { data: activity, isLoading: activityLoading } = useActivity({
    limit: 20,
  });
  const { data: alerts } = useAlerts({ acked: false, limit: 50 });
  const { data: nodes } = useNodes();
  const { lastBootstrapAt } = useRealtime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const criticalUnacked = useMemo(
    () =>
      (alerts ?? []).filter(
        (a) => !a.acknowledged && a.severity === 'CRITICAL'
      ),
    [alerts]
  );

  const offlineIds = useMemo(
    () =>
      (nodes ?? [])
        .filter((n) => n.status === 'OFFLINE')
        .map((n) => n.id)
        .sort(),
    [nodes]
  );

  const lowBattery = useMemo(() => {
    const candidates = (nodes ?? []).filter(
      (n): n is typeof n & { battery: number } =>
        typeof n.battery === 'number' && n.battery <= LOW_BATTERY_PCT
    );
    if (candidates.length === 0) return null;
    const worst = candidates.reduce((a, b) => (a.battery <= b.battery ? a : b));
    return { id: worst.id, battery: worst.battery };
  }, [nodes]);

  const byPriority = useMemo<Record<Priority, number>>(
    () => kpi?.byPriority ?? { RED: 0, YELLOW: 0, GREEN: 0, BLACK: 0 },
    [kpi?.byPriority]
  );

  const total = kpi?.total ?? 0;
  const clock = formatWibClock(lastBootstrapAt);

  if (kpiLoading && !kpi) {
    return (
      <div data-testid="page-home" className="space-y-3.5">
        <PageHeader clock={clock} />
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.1fr_2fr]">
          <div className="bg-card rounded-card h-40 animate-pulse" />
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-card h-28 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kpiError && !kpi) {
    return (
      <div data-testid="page-home" className="space-y-3.5">
        <PageHeader clock={clock} />
        <EmptyState
          title="Gagal memuat KPI"
          description="Periksa koneksi ke backend, lalu muat ulang."
        />
      </div>
    );
  }

  return (
    <div data-testid="page-home" className="space-y-3.5">
      <PageHeader clock={clock} />

      {criticalUnacked.length > 0 ? (
        <div
          data-testid="critical-strip"
          className="bg-triage-red/10 rounded-card flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <TriangleAlert
              className="text-triage-red size-[18px] shrink-0"
              aria-hidden
            />
            <p className="text-triage-red text-[0.9375rem] font-semibold">
              {criticalUnacked.length} alert CRITICAL belum di-ack
            </p>
          </div>
          <Link
            href="/alert"
            className="bg-triage-red rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Buka Alert
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.1fr_2fr]">
        <HeroCard total={total} byPriority={byPriority} />
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          {PRIORITIES.map((p) => (
            <TriageTile
              key={p}
              priority={p}
              count={byPriority[p] ?? 0}
              total={total}
            />
          ))}
        </div>
      </section>

      {total === 0 ? (
        <EmptyState
          title="Belum ada korban"
          description="Menunggu data node lapangan / simulator."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <DonutCard total={total} byPriority={byPriority} />
        <ActivityCard items={activity} loading={activityLoading} now={now} />
      </div>

      <NodeSummary
        onlineNodes={kpi?.onlineNodes ?? 0}
        totalNodes={kpi?.totalNodes ?? 0}
        offlineIds={offlineIds}
        lowBattery={lowBattery}
      />
    </div>
  );
}

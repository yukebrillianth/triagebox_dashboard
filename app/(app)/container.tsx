'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { EmptyState, formatRelativeWib } from '@/components/triage';
import { useActivity, useAlerts, useKpis } from '@/hooks/use-api';
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

const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

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

function KpiCard({
  label,
  value,
  testId,
  valueClass,
}: {
  label: string;
  value: number | string;
  testId: string;
  valueClass?: string;
}) {
  return (
    <div className="border-border bg-card border px-4 py-4">
      <p className="text-muted text-sm font-medium">
        {label}
      </p>
      <p
        data-testid={testId}
        className={cn(
          'mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight',
          valueClass ?? 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BerandaContainer() {
  const { data: kpi, isLoading: kpiLoading, isError: kpiError } = useKpis();
  const { data: activity, isLoading: activityLoading } = useActivity({
    limit: 20,
  });
  const { data: alerts } = useAlerts({ acked: false, limit: 50 });
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

  const donutData = useMemo(() => {
    const bp = kpi?.byPriority;
    if (!bp) return [];
    return PRIORITIES.map((p) => ({
      key: p,
      name: TRIAGE_LABELS[p],
      value: bp[p] ?? 0,
      color: TRIAGE_COLORS[p],
    })).filter((d) => d.value > 0);
  }, [kpi?.byPriority]);

  const total = kpi?.total ?? 0;
  const onlineNodes = kpi?.onlineNodes ?? 0;
  const totalNodes = kpi?.totalNodes ?? 0;
  const offlineNodes = Math.max(0, totalNodes - onlineNodes);

  if (kpiLoading && !kpi) {
    return (
      <div data-testid="page-home" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Beranda
          </h1>
          <p className="text-muted mt-1 text-sm">Memuat ringkasan…</p>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card h-24 animate-pulse border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (kpiError && !kpi) {
    return (
      <div data-testid="page-home" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Beranda
          </h1>
        </header>
        <EmptyState
          title="Gagal memuat KPI"
          description="Periksa koneksi ke backend, lalu muat ulang."
        />
      </div>
    );
  }

  return (
    <div data-testid="page-home" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Beranda
          </h1>
          <p className="text-muted mt-1 text-base">
            Ringkasan triase realtime
          </p>
        </div>
        <p
          data-testid="last-update"
          className="text-muted font-mono text-sm tabular-nums"
        >
          Update: {formatWibClock(lastBootstrapAt)} WIB
        </p>
      </header>

      {criticalUnacked.length > 0 ? (
        <div
          data-testid="critical-strip"
          className="border-triage-red bg-card flex flex-wrap items-center justify-between gap-3 border border-l-4 px-4 py-3"
        >
          <p className="text-triage-red text-base font-semibold">
            {criticalUnacked.length} alert CRITICAL belum di-ack
          </p>
          <Link
            href="/alert"
            className="bg-triage-red text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold"
          >
            Buka Alert
          </Link>
        </div>
      ) : null}

      <section
        aria-label="KPI triase"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5"
      >
        <KpiCard
          label="Total"
          value={total}
          testId="kpi-total"
          valueClass="text-foreground"
        />
        <KpiCard
          label="Merah"
          value={kpi?.byPriority.RED ?? 0}
          testId="kpi-red"
          valueClass="text-triage-red"
        />
        <KpiCard
          label="Kuning"
          value={kpi?.byPriority.YELLOW ?? 0}
          testId="kpi-yellow"
          valueClass="text-triage-yellow"
        />
        <KpiCard
          label="Hijau"
          value={kpi?.byPriority.GREEN ?? 0}
          testId="kpi-green"
          valueClass="text-triage-green"
        />
        <KpiCard
          label="Hitam"
          value={kpi?.byPriority.BLACK ?? 0}
          testId="kpi-black"
          valueClass="text-foreground"
        />
      </section>

      {total === 0 ? (
        <EmptyState
          title="Belum ada korban"
          description="Menunggu data node lapangan / simulator."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <section className="border-border bg-card border p-4 lg:col-span-4 xl:col-span-5">
          <h2 className="text-foreground text-base font-semibold tracking-tight">
            Distribusi Triase
          </h2>
          <div
            data-testid="triage-donut"
            className="mt-4 h-60 w-full"
          >
            {donutData.length === 0 ? (
              <p className="text-muted flex h-full items-center justify-center text-sm">
                Tidak ada data
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="var(--border)"
                    strokeWidth={1}
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.color}
                        fillOpacity={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      fontSize: 13,
                      color: 'var(--foreground)',
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [
                      String(value ?? 0),
                      'Jumlah',
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="square"
                    formatter={(value) => (
                      <span className="text-muted text-sm">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="border-border bg-card border p-4 lg:col-span-3 xl:col-span-3">
          <h2 className="text-foreground text-base font-semibold tracking-tight">
            Node
          </h2>
          <div className="mt-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-sm">
                Online
              </span>
              <span
                data-testid="nodes-online"
                className="text-triage-green font-mono text-2xl font-semibold tabular-nums"
              >
                {onlineNodes}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-sm">
                Offline
              </span>
              <span
                data-testid="nodes-offline"
                className="text-triage-red font-mono text-2xl font-semibold tabular-nums"
              >
                {offlineNodes}
              </span>
            </div>
            <div className="border-border border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-muted text-sm">
                  Total
                </span>
                <span
                  data-testid="nodes-total"
                  className="text-foreground font-mono text-xl font-semibold tabular-nums"
                >
                  {totalNodes}
                </span>
              </div>
              {totalNodes > 0 ? (
                <div className="bg-border mt-3 h-2 overflow-hidden">
                  <div
                    className="bg-triage-green h-full"
                    style={{
                      width: `${Math.min(100, (onlineNodes / totalNodes) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-border bg-card border p-4 lg:col-span-5 xl:col-span-4">
          <h2 className="text-foreground text-base font-semibold tracking-tight">
            Aktivitas
          </h2>
          <ul
            data-testid="activity-feed"
            className="mt-4 max-h-72 space-y-0 overflow-y-auto"
          >
            {activityLoading && !activity ? (
              <li className="text-muted py-8 text-center text-sm">
                Memuat aktivitas…
              </li>
            ) : !activity || activity.length === 0 ? (
              <li className="text-muted py-8 text-center text-sm">
                Belum ada aktivitas
              </li>
            ) : (
              activity.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  data-testid="activity-item"
                  className="border-border flex gap-3 border-b py-3 last:border-b-0"
                >
                  <span className="text-muted shrink-0 font-mono text-sm tabular-nums">
                    {formatRelativeWib(item.createdAt, now)}
                  </span>
                  <span className="text-foreground min-w-0 flex-1 text-sm leading-snug">
                    {item.message}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

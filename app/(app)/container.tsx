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
  RED: '#EF4444',
  YELLOW: '#EAB308',
  GREEN: '#22C55E',
  BLACK: '#1F2937',
};

const TRIAGE_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

function formatWibClock(ts: number | null): string {
  if (ts == null) return '—';
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
    <div className="border-border bg-card rounded-md border px-3 py-3">
      <p className="text-muted text-[11px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p
        data-testid={testId}
        className={cn(
          'mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight',
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
      <div data-testid="page-home" className="space-y-4">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Beranda
          </h1>
          <p className="text-muted mt-1 text-sm">Memuat ringkasan…</p>
        </header>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card h-[72px] animate-pulse rounded-md border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (kpiError && !kpi) {
    return (
      <div data-testid="page-home" className="space-y-4">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
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
    <div data-testid="page-home" className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Beranda
          </h1>
          <p className="text-muted mt-1 text-sm">
            Ringkasan triase realtime
          </p>
        </div>
        <p
          data-testid="last-update"
          className="text-muted font-mono text-xs tabular-nums"
        >
          Update: {formatWibClock(lastBootstrapAt)} WIB
        </p>
      </header>

      {criticalUnacked.length > 0 ? (
        <div
          data-testid="critical-strip"
          className="border-triage-red/40 bg-triage-red/10 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
        >
          <p className="text-triage-red text-sm font-semibold">
            {criticalUnacked.length} alert CRITICAL belum di-ack
          </p>
          <Link
            href="/alert"
            className="bg-triage-red rounded-sm px-2.5 py-1 text-xs font-semibold text-white"
          >
            Buka Alert →
          </Link>
        </div>
      ) : null}

      <section
        aria-label="KPI triase"
        className="grid grid-cols-2 gap-2 md:grid-cols-5"
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="border-border bg-card rounded-md border p-3 lg:col-span-1">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Distribusi Triase
          </h2>
          <div
            data-testid="triage-donut"
            className="mt-2 h-[220px] w-full"
          >
            {donutData.length === 0 ? (
              <p className="text-muted flex h-full items-center justify-center text-xs">
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
                      fontSize: 12,
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
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-muted text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="border-border bg-card rounded-md border p-3 lg:col-span-1">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Node
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-xs uppercase tracking-wider">
                Online
              </span>
              <span
                data-testid="nodes-online"
                className="text-triage-green font-mono text-xl font-semibold tabular-nums"
              >
                {onlineNodes}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-xs uppercase tracking-wider">
                Offline
              </span>
              <span
                data-testid="nodes-offline"
                className="text-triage-red font-mono text-xl font-semibold tabular-nums"
              >
                {offlineNodes}
              </span>
            </div>
            <div className="border-border border-t pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-muted text-xs uppercase tracking-wider">
                  Total
                </span>
                <span
                  data-testid="nodes-total"
                  className="text-foreground font-mono text-lg font-semibold tabular-nums"
                >
                  {totalNodes}
                </span>
              </div>
              {totalNodes > 0 ? (
                <div className="bg-border mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-triage-green h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (onlineNodes / totalNodes) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-border bg-card rounded-md border p-3 lg:col-span-1">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Aktivitas
          </h2>
          <ul
            data-testid="activity-feed"
            className="mt-2 max-h-[240px] space-y-0 overflow-y-auto"
          >
            {activityLoading && !activity ? (
              <li className="text-muted py-6 text-center text-xs">
                Memuat aktivitas…
              </li>
            ) : !activity || activity.length === 0 ? (
              <li className="text-muted py-6 text-center text-xs">
                Belum ada aktivitas
              </li>
            ) : (
              activity.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  data-testid="activity-item"
                  className="border-border flex gap-2 border-b py-2 last:border-b-0"
                >
                  <span className="text-muted shrink-0 font-mono text-[10px] tabular-nums">
                    {formatRelativeWib(item.createdAt, now)}
                  </span>
                  <span className="text-foreground min-w-0 flex-1 text-xs leading-snug">
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

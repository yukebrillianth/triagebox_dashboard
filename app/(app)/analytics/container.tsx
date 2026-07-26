'use client';

import { useMemo, type ReactNode } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/triage';
import { useAnalytics } from '@/hooks/use-api';
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

const CHART_TOOLTIP = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 13,
  color: 'var(--foreground)',
};

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function batteryBarColor(pct: number | null): string {
  if (pct == null) return 'var(--muted)';
  if (pct <= 20) return 'var(--triage-red)';
  if (pct <= 40) return 'var(--triage-yellow)';
  return 'var(--triage-green)';
}

function batteryTextClass(pct: number | null): string {
  if (pct == null) return 'text-muted';
  if (pct <= 20) return 'text-triage-red';
  if (pct <= 40) return 'text-triage-yellow';
  return 'text-triage-green';
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
      className={cn('border-border bg-card border p-4 md:p-6', className)}
    >
      <h2 className="text-foreground text-base font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AnalyticsContainer() {
  const { data, isLoading, isError } = useAnalytics();

  const priorityPie = useMemo(() => {
    const bp = data?.byPriority;
    if (!bp) return [];
    return PRIORITIES.map((p) => ({
      key: p,
      name: TRIAGE_LABELS[p],
      value: bp[p] ?? 0,
      color: TRIAGE_COLORS[p],
    })).filter((d) => d.value > 0);
  }, [data?.byPriority]);

  const priorityBar = useMemo(() => {
    const bp = data?.byPriority;
    if (!bp) return [];
    return PRIORITIES.map((p) => ({
      key: p,
      name: TRIAGE_LABELS[p],
      value: bp[p] ?? 0,
      color: TRIAGE_COLORS[p],
    }));
  }, [data?.byPriority]);

  const hourly = useMemo(() => {
    return (data?.hourlyTrend ?? []).map((pt) => ({
      hour: pt.hour,
      label: formatHourLabel(pt.hour),
      count: pt.count,
    }));
  }, [data?.hourlyTrend]);

  const telemetry = data?.nodesTelemetry ?? [];
  const batteryRows = useMemo(
    () =>
      [...telemetry]
        .map((n) => ({
          id: n.id,
          name: n.name || n.id,
          battery: n.battery,
        }))
        .sort((a, b) => (b.battery ?? -1) - (a.battery ?? -1)),
    [telemetry]
  );

  if (isLoading && !data) {
    return (
      <div data-testid="page-analytics" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="text-muted mt-1 text-base">Memuat ringkasan…</p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card h-60 animate-pulse border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-analytics" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Analytics
          </h1>
        </header>
        <EmptyState
          title="Gagal memuat analytics"
          description="Periksa koneksi ke backend, lalu muat ulang."
        />
      </div>
    );
  }

  const activeNodes = data?.activeNodes ?? 0;
  const avgBattery = data?.avgBattery;
  const avgLabel =
    avgBattery == null || Number.isNaN(avgBattery)
      ? '-'
      : `${Math.round(avgBattery)}%`;

  return (
    <div data-testid="page-analytics" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="text-muted mt-1 text-base">
            Ringkasan 24 jam · data live API
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="border-border bg-card border px-4 py-3">
            <p className="text-muted text-sm font-medium">
              Node online
            </p>
            <p
              data-testid="analytics-active-nodes"
              className="text-triage-green font-mono text-2xl font-semibold tabular-nums"
            >
              {activeNodes}
            </p>
          </div>
          <div className="border-border bg-card border px-4 py-3">
            <p className="text-muted text-sm font-medium">
              Avg battery
            </p>
            <p
              data-testid="analytics-avg-battery"
              className={cn(
                'font-mono text-2xl font-semibold tabular-nums',
                batteryTextClass(
                  avgBattery == null ? null : Math.round(avgBattery)
                )
              )}
            >
              {avgLabel}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <Panel
          title="Distribusi prioritas"
          testId="chart-priority-pie"
          className="lg:col-span-5"
        >
          <div className="h-60 w-full">
            {priorityPie.length === 0 ? (
              <p className="text-muted flex h-full items-center justify-center text-sm">
                Tidak ada data prioritas
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPie}
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
                    {priorityPie.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} fillOpacity={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [String(value ?? 0), 'Jumlah']}
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
        </Panel>

        <Panel
          title="Jumlah per prioritas"
          testId="chart-priority-bar"
          className="lg:col-span-7"
        >
          <div className="h-60 w-full">
            {priorityBar.every((d) => d.value === 0) ? (
              <p className="text-muted flex h-full items-center justify-center text-sm">
                Tidak ada data prioritas
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityBar}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: 'var(--foreground)' }}
                    cursor={{ fill: 'var(--border)', opacity: 0.35 }}
                    formatter={(value) => [String(value ?? 0), 'Jumlah']}
                  />
                  <Bar dataKey="value" radius={[0, 0, 0, 0]} maxBarSize={48}>
                    {priorityBar.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} fillOpacity={1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          title="Tren vital 24 jam"
          testId="chart-hourly-trend"
          className="lg:col-span-12"
        >
          <div className="h-64 w-full">
            {hourly.length === 0 ? (
              <p className="text-muted flex h-full items-center justify-center text-sm">
                Tidak ada tren jam
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={hourly}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: 'var(--foreground)' }}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { hour?: string; label?: string }
                        | undefined;
                      if (!row?.hour) return row?.label ?? '';
                      return new Date(row.hour).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    }}
                    formatter={(value) => [String(value ?? 0), 'Pembacaan']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: 'var(--accent)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          title="Battery node"
          testId="chart-battery-bars"
          className="lg:col-span-5"
        >
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {batteryRows.length === 0 ? (
              <p className="text-muted py-10 text-center text-sm">
                Tidak ada telemetry node
              </p>
            ) : (
              batteryRows.map((n) => {
                const pct = n.battery;
                const width =
                  pct == null ? 0 : Math.max(0, Math.min(100, pct));
                return (
                  <div
                    key={n.id}
                    data-testid={`battery-row-${n.id}`}
                    className="space-y-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-foreground truncate text-sm font-medium">
                        {n.name}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-sm tabular-nums',
                          batteryTextClass(pct)
                        )}
                      >
                        {pct == null ? '-' : `${pct}%`}
                      </span>
                    </div>
                    <div className="bg-border h-2 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: batteryBarColor(pct),
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          title="Sinyal terbaru (RSSI / SNR)"
          testId="table-signal"
          className="lg:col-span-7"
        >
          {telemetry.length === 0 ? (
            <p className="text-muted py-10 text-center text-sm">
              Tidak ada telemetry node
            </p>
          ) : (
            <div className="border-border max-h-80 overflow-auto border">
              <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="border-border text-muted border-b text-sm font-semibold">
                    <th className="px-3 py-3">Node</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">RSSI</th>
                    <th className="px-3 py-3">SNR</th>
                    <th className="px-3 py-3">Bat</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((n) => {
                    const online = n.status === 'ONLINE';
                    return (
                      <tr
                        key={n.id}
                        data-testid={`signal-row-${n.id}`}
                        className="border-border hover:bg-control-hover border-b last:border-b-0"
                      >
                        <td className="max-w-40 px-3 py-3">
                          <p className="text-foreground truncate text-sm font-medium">
                            {n.name || n.id}
                          </p>
                          <p className="text-muted truncate font-mono text-sm tabular-nums">
                            {n.id}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 border-l-2 pl-2 text-sm font-semibold',
                              online
                                ? 'border-triage-green text-triage-green'
                                : 'border-border text-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'size-2.5 shrink-0',
                                online ? 'bg-triage-green' : 'bg-muted'
                              )}
                              aria-hidden
                            />
                            {n.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-sm tabular-nums">
                          {n.rssi == null ? '-' : n.rssi}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm tabular-nums">
                          {n.snr == null
                            ? '-'
                            : Number.isInteger(n.snr)
                              ? n.snr
                              : n.snr.toFixed(1)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-3 font-mono text-sm tabular-nums',
                            batteryTextClass(n.battery)
                          )}
                        >
                          {n.battery == null ? '-' : `${n.battery}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

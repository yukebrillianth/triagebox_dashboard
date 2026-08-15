'use client';

import { useMemo, type ReactNode } from 'react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  borderRadius: 8,
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
  if (pct <= 20) return 'text-triage-red-ink';
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
      className={cn('bg-card rounded-card p-4 sm:p-5', className)}
    >
      <h2 className="text-foreground text-[0.9375rem] font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AnalyticsContainer() {
  const { data, isLoading, isError } = useAnalytics();

  // Recharts 3 reads `fill` off each datum; `<Cell>` is deprecated.
  const priorityPie = useMemo(() => {
    const bp = data?.byPriority;
    if (!bp) return [];
    return PRIORITIES.map((p) => ({
      key: p,
      name: TRIAGE_LABELS[p],
      value: bp[p] ?? 0,
      fill: TRIAGE_COLORS[p],
    })).filter((d) => d.value > 0);
  }, [data?.byPriority]);

  const priorityBar = useMemo(() => {
    const bp = data?.byPriority;
    if (!bp) return [];
    return PRIORITIES.map((p) => ({
      key: p,
      name: TRIAGE_LABELS[p],
      value: bp[p] ?? 0,
      fill: TRIAGE_COLORS[p],
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
      <div data-testid="page-analytics" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Analytics
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Memuat ringkasan…
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card h-60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-analytics" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
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
    <div data-testid="page-analytics" className="space-y-3.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Analytics
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Ringkasan 24 jam · data live API
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-card rounded-card flex flex-col gap-[3px] px-[18px] py-3">
            <span className="text-muted text-[0.6875rem]">Node online</span>
            <span
              data-testid="analytics-active-nodes"
              className="text-triage-green font-mono text-[1.375rem] leading-none font-semibold tabular-nums"
            >
              {activeNodes}
            </span>
          </div>
          <div className="bg-card rounded-card flex flex-col gap-[3px] px-[18px] py-3">
            <span className="text-muted text-[0.6875rem]">Avg battery</span>
            <span
              data-testid="analytics-avg-battery"
              className={cn(
                'font-mono text-[1.375rem] leading-none font-semibold tabular-nums',
                batteryTextClass(
                  avgBattery == null ? null : Math.round(avgBattery)
                )
              )}
            >
              {avgLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [String(value ?? 0), 'Jumlah']}
                  />
                  <Legend
                    height={28}
                    iconType="square"
                    formatter={(value) => (
                      <span className="text-foreground-soft text-[0.8125rem]">
                        {value}
                      </span>
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
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          title="Tren pembacaan vital 24 jam"
          testId="chart-hourly-trend"
          className="lg:col-span-12"
        >
          <div className="h-[210px] w-full">
            {hourly.length === 0 ? (
              <p className="text-muted flex h-full items-center justify-center text-sm">
                Tidak ada tren jam
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={hourly}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--control-hover)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--dim)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--dim)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: 'var(--foreground)' }}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        { hour?: string; label?: string } | undefined;
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
                  {/* Design fills under the line at 10% accent. */}
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="var(--accent)"
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={{ r: 3, fill: 'var(--accent)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          title="Battery node"
          testId="chart-battery-bars"
          className="lg:col-span-5"
        >
          <div className="-mx-2 max-h-[328px] space-y-[3px] overflow-y-auto">
            {batteryRows.length === 0 ? (
              <p className="text-muted py-10 text-center text-sm">
                Tidak ada telemetry node
              </p>
            ) : (
              batteryRows.map((n) => {
                const pct = n.battery;
                const width = pct == null ? 0 : Math.max(0, Math.min(100, pct));
                return (
                  <div
                    key={n.id}
                    data-testid={`battery-row-${n.id}`}
                    className="hover:bg-chip space-y-1.5 rounded-lg px-2 py-[7px]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-foreground-soft truncate text-xs">
                        {n.name}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-xs font-semibold tabular-nums',
                          batteryTextClass(pct)
                        )}
                      >
                        {pct == null ? '-' : `${pct}%`}
                      </span>
                    </div>
                    <div className="bg-control-hover h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full"
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

        {/* Not a Panel: the design bleeds the table head to the card edges. */}
        <section
          data-testid="table-signal"
          className="bg-card rounded-card overflow-hidden lg:col-span-7"
        >
          <h2 className="text-foreground px-5 pt-[18px] pb-3.5 text-[0.9375rem] font-semibold">
            Sinyal terbaru (RSSI / SNR)
          </h2>
          {telemetry.length === 0 ? (
            <p className="text-muted px-5 pb-10 text-center text-sm">
              Tidak ada telemetry node
            </p>
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead className="bg-surface-header sticky top-0 z-10">
                  <tr className="text-muted text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
                    <th className="px-5 py-2.5 font-semibold">Node</th>
                    <th className="w-[116px] px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th className="w-[78px] px-3 py-2.5 text-right font-semibold">
                      RSSI
                    </th>
                    <th className="w-[68px] px-3 py-2.5 text-right font-semibold">
                      SNR
                    </th>
                    <th className="w-[68px] px-5 py-2.5 text-right font-semibold">
                      Bat
                    </th>
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
                        <td className="max-w-40 px-5 py-2.5">
                          <span className="text-foreground block truncate text-[0.8125rem]">
                            {n.name || n.id}
                          </span>
                          <span className="text-muted block truncate font-mono text-[0.6875rem] tabular-nums">
                            {n.id}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 text-xs font-semibold',
                              online ? 'text-triage-green' : 'text-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'size-2 shrink-0 rounded-full',
                                online ? 'bg-triage-green' : 'bg-muted'
                              )}
                              aria-hidden
                            />
                            {n.status}
                          </span>
                        </td>
                        <td className="text-foreground-soft px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                          {n.rssi == null ? '-' : n.rssi}
                        </td>
                        <td className="text-foreground-soft px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                          {n.snr == null
                            ? '-'
                            : Number.isInteger(n.snr)
                              ? n.snr
                              : n.snr.toFixed(1)}
                        </td>
                        <td
                          className={cn(
                            'px-5 py-2.5 text-right font-mono text-xs font-semibold tabular-nums',
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
        </section>
      </div>
    </div>
  );
}

'use client';

import { EmptyState } from '@/components/triage';
import { useHealth } from '@/hooks/use-api';
import { cn } from '@/lib/cn';

function formatUptime(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '-';
  const s = Math.floor(sec);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}j ${mins}m`;
  if (hours > 0) return `${hours}j ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function isUp(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === 'up' || v === 'ok' || v === 'online' || v === 'healthy';
}

function isOkStatus(value: string | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase() === 'ok';
}

function HealthCard({
  label,
  value,
  testId,
  tone,
  mono,
}: {
  label: string;
  value: string;
  testId: string;
  tone: 'ok' | 'bad' | 'neutral';
  mono?: boolean;
}) {
  return (
    <div className="bg-card rounded-card flex flex-col gap-2.5 p-5">
      <span className="text-muted text-[0.8125rem]">{label}</span>
      <span
        data-testid={testId}
        className={cn(
          'text-[1.625rem] leading-none font-semibold',
          mono && 'font-mono tabular-nums',
          tone === 'ok' && 'text-triage-green',
          tone === 'bad' && 'text-triage-red-ink',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function StatusContainer() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useHealth({
      refetchInterval: 15_000,
    });

  if (isLoading && !data) {
    return (
      <div data-testid="page-status" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Status
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Memuat health backend…
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-status" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Status
          </h1>
        </header>
        <EmptyState
          title="Gagal memuat health"
          description="Backend tidak merespons /api/health."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="bg-accent text-accent-foreground rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold hover:opacity-90"
            >
              Coba lagi
            </button>
          }
        />
      </div>
    );
  }

  const status = data?.status ?? '-';
  const db = data?.db ?? '-';
  const mqtt = data?.mqtt ?? '-';
  const uptimeSec = data?.uptimeSec;

  const statusOk = isOkStatus(status);
  const dbUp = isUp(db);
  const mqttUp = isUp(mqtt);
  const overallOk = statusOk && dbUp && mqttUp;

  const lastCheck =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';

  return (
    <div data-testid="page-status" className="space-y-3.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Status
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Health backend · DB · MQTT · uptime
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="health-overall"
            className={cn(
              'inline-flex min-h-11 items-center gap-2 border-l-2 pl-3 text-[0.8125rem] font-semibold sm:min-h-0',
              overallOk
                ? 'border-triage-green text-triage-green'
                : 'border-triage-red text-triage-red-ink'
            )}
          >
            <span
              className={cn(
                'size-2.5 shrink-0',
                overallOk ? 'bg-triage-green' : 'bg-triage-red'
              )}
              aria-hidden
            />
            {overallOk ? 'Sehat' : 'Degraded'}
          </span>
          <button
            type="button"
            data-testid="btn-refresh-health"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-chip text-foreground-soft hover:text-accent rounded-control h-11 px-4 text-[0.8125rem] font-medium transition-colors disabled:opacity-50 sm:h-[38px]"
          >
            {isFetching ? 'Memuat…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section
        aria-label="Health cards"
        className="grid grid-cols-2 gap-3.5 md:grid-cols-4"
      >
        <HealthCard
          label="Status"
          value={status}
          testId="health-status"
          tone={statusOk ? 'ok' : 'bad'}
        />
        <HealthCard
          label="Database"
          value={db}
          testId="health-db"
          tone={dbUp ? 'ok' : 'bad'}
        />
        <HealthCard
          label="MQTT"
          value={mqtt}
          testId="health-mqtt"
          tone={mqttUp ? 'ok' : 'bad'}
        />
        <HealthCard
          label="Uptime"
          value={formatUptime(uptimeSec)}
          testId="health-uptime"
          tone="neutral"
          mono
        />
      </section>

      <section className="bg-card rounded-card flex flex-col gap-4 p-[22px]">
        <h2 className="text-foreground text-[0.9375rem] font-semibold">
          Detail
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="bg-surface-input rounded-control flex items-center justify-between gap-4 px-4 py-3.5">
            <dt className="text-muted text-[0.8125rem]">Uptime (detik)</dt>
            <dd
              data-testid="health-uptime-sec"
              className="text-foreground font-mono text-sm tabular-nums"
            >
              {uptimeSec == null ? '-' : Math.floor(uptimeSec)}
            </dd>
          </div>
          <div className="bg-surface-input rounded-control flex items-center justify-between gap-4 px-4 py-3.5">
            <dt className="text-muted text-[0.8125rem]">Cek terakhir (WIB)</dt>
            <dd className="text-foreground font-mono text-sm tabular-nums">
              {lastCheck}
            </dd>
          </div>
        </dl>
        <p className="text-muted text-[0.8125rem] leading-relaxed">
          Hanya menampilkan status, db, mqtt, dan uptime dari{' '}
          <code className="text-accent font-mono">/api/health</code>. Tidak ada
          metrik CPU/disk.
        </p>
      </section>
    </div>
  );
}

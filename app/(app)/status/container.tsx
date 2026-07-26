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
    <div className="border-border bg-card border px-4 py-5">
      <p className="text-muted text-sm font-medium">
        {label}
      </p>
      <p
        data-testid={testId}
        className={cn(
          'mt-3 text-3xl font-semibold tracking-tight',
          mono && 'font-mono tabular-nums',
          tone === 'ok' && 'text-triage-green',
          tone === 'bad' && 'text-triage-red',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </p>
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
      <div data-testid="page-status" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Status
          </h1>
          <p className="text-muted mt-1 text-base">Memuat health backend…</p>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card h-28 animate-pulse border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div data-testid="page-status" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
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
              className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold"
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
    <div data-testid="page-status" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Status
          </h1>
          <p className="text-muted mt-1 text-base">
            Health backend · DB · MQTT · uptime
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="health-overall"
            className={cn(
              'inline-flex min-h-11 items-center gap-2 border-l-2 pl-3 text-sm font-semibold',
              overallOk
                ? 'border-triage-green text-triage-green'
                : 'border-triage-red text-triage-red'
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
            className="border-border bg-background text-foreground hover:border-accent hover:bg-control-hover disabled:text-muted min-h-11 border px-4 text-sm font-medium disabled:opacity-50"
          >
            {isFetching ? 'Memuat…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section
        aria-label="Health cards"
        className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
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

      <section className="border-border bg-card border p-4 md:p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">
          Detail
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border-border flex items-center justify-between gap-3 border px-4 py-3">
            <dt className="text-muted text-sm">
              Uptime (detik)
            </dt>
            <dd
              data-testid="health-uptime-sec"
              className="text-foreground font-mono text-base tabular-nums"
            >
              {uptimeSec == null ? '-' : Math.floor(uptimeSec)}
            </dd>
          </div>
          <div className="border-border flex items-center justify-between gap-3 border px-4 py-3">
            <dt className="text-muted text-sm">
              Cek terakhir (WIB)
            </dt>
            <dd className="text-foreground font-mono text-base tabular-nums">
              {lastCheck}
            </dd>
          </div>
        </dl>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Hanya menampilkan status, db, mqtt, dan uptime dari{' '}
          <code className="text-accent font-mono">/api/health</code>. Tidak ada
          metrik CPU/disk.
        </p>
      </section>
    </div>
  );
}

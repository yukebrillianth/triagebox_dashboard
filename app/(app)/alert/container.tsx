'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { EmptyState, formatRelativeWib } from '@/components/triage';
import { Chip } from '@/components/ui';
import { queryKeys, useAlerts } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Alert, ListAlertsParams } from '@/types';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';
type AckedFilter = 'all' | 'unacked' | 'acked';

const SEVERITY_OPTS: SeverityFilter[] = ['ALL', 'CRITICAL', 'WARNING', 'INFO'];
const ACKED_OPTS: { value: AckedFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'unacked', label: 'Belum ack' },
  { value: 'acked', label: 'Sudah ack' },
];

const SEV_TEXT: Record<string, string> = {
  CRITICAL: 'text-triage-red',
  WARNING: 'text-triage-yellow',
  INFO: 'text-muted',
};

const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-triage-red',
  WARNING: 'bg-triage-yellow',
  INFO: 'bg-muted',
};

const SEV_TONE = {
  ALL: 'accent',
  CRITICAL: 'red',
  WARNING: 'yellow',
  INFO: 'accent',
} as const;

function severityText(sev: string): string {
  return SEV_TEXT[sev] ?? SEV_TEXT.INFO;
}

function severityDot(sev: string): string {
  return SEV_DOT[sev] ?? SEV_DOT.INFO;
}

function createdMs(a: Alert): number {
  const t = Date.parse(a.createdAt);
  return Number.isNaN(t) ? 0 : t;
}

export function AlertContainer() {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState<SeverityFilter>('ALL');
  const [acked, setAcked] = useState<AckedFilter>('unacked');
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const params = useMemo<ListAlertsParams>(() => {
    const p: ListAlertsParams = { limit: 100 };
    if (severity !== 'ALL') p.severity = severity;
    if (acked === 'acked') p.acked = true;
    else if (acked === 'unacked') p.acked = false;
    return p;
  }, [severity, acked]);

  const { data, isLoading, isError, error, refetch } = useAlerts(params);

  const rows = useMemo(() => {
    const list = (data ?? []).slice();
    list.sort((a, b) => createdMs(b) - createdMs(a));
    return list;
  }, [data]);

  const handleAck = useCallback(
    async (alert: Alert) => {
      if (alert.acknowledged || ackingId) return;
      setAckingId(alert.id);

      const prevSnapshots = queryClient.getQueriesData<Alert[]>({
        queryKey: [...queryKeys.alerts.all, 'list'],
      });

      queryClient.setQueriesData<Alert[]>(
        { queryKey: [...queryKeys.alerts.all, 'list'] },
        (old) => {
          if (!old) return old;
          return old.map((a) =>
            a.id === alert.id ? { ...a, acknowledged: true } : a
          );
        }
      );

      try {
        const updated = await api.ackAlert(alert.id);
        queryClient.setQueriesData<Alert[]>(
          { queryKey: [...queryKeys.alerts.all, 'list'] },
          (old) => {
            if (!old) return old;
            return old.map((a) =>
              a.id === alert.id ? { ...a, ...updated } : a
            );
          }
        );
      } catch {
        for (const [key, snap] of prevSnapshots) {
          queryClient.setQueryData(key, snap);
        }
      } finally {
        setAckingId(null);
      }
    },
    [ackingId, queryClient]
  );

  const unackedCritical = useMemo(
    () =>
      (data ?? []).filter((a) => !a.acknowledged && a.severity === 'CRITICAL')
        .length,
    [data]
  );

  return (
    <div data-testid="page-alert" className="space-y-3.5">
      <header>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Alert Center
        </h1>
        <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
          Notifikasi kritis, peringatan, dan info sistem.
        </p>
      </header>

      <div className="bg-card rounded-card flex flex-wrap items-center gap-2.5 px-3.5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTS.map((s) => (
            <Chip
              key={s}
              active={severity === s}
              tone={SEV_TONE[s]}
              onClick={() => setSeverity(s)}
            >
              {s === 'ALL' ? 'Semua' : s}
            </Chip>
          ))}
        </div>
        <span
          className="bg-control-hover mx-1 hidden h-6 w-px sm:block"
          aria-hidden
        />
        <div className="flex flex-wrap gap-1.5">
          {ACKED_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={acked === o.value}
              onClick={() => setAcked(o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        <span className="text-muted ml-auto text-xs tabular-nums">
          {rows.length} alert
          {unackedCritical > 0
            ? ` · ${unackedCritical} critical belum di-ack`
            : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card h-12 animate-pulse" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="bg-triage-red/10 rounded-card px-4 py-3">
          <p className="text-triage-red text-sm font-semibold">
            Gagal memuat alert
            {error?.message ? `: ${error.message}` : ''}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-accent mt-1 min-h-11 text-sm underline hover:opacity-90"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState
          title="Tidak ada alert"
          description="Tidak ada notifikasi untuk filter saat ini."
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="bg-card rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-surface-header text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                  <th className="px-5 py-2.5 font-semibold">Severity</th>
                  <th className="px-5 py-2.5 font-semibold">Tipe</th>
                  <th className="px-5 py-2.5 font-semibold">Pesan</th>
                  <th className="px-5 py-2.5 font-semibold">Waktu</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alert) => (
                  <tr
                    key={alert.id}
                    data-testid={`alert-row-${alert.id}`}
                    data-severity={alert.severity}
                    data-acked={alert.acknowledged ? 'true' : 'false'}
                    className={cn(
                      'border-border border-b last:border-b-0',
                      alert.acknowledged && 'opacity-55'
                    )}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'flex items-center gap-2 text-xs font-semibold',
                          severityText(alert.severity)
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block size-2 shrink-0',
                            severityDot(alert.severity)
                          )}
                          aria-hidden
                        />
                        {alert.severity}
                      </span>
                    </td>
                    <td className="text-muted px-5 py-3 font-mono text-xs">
                      {alert.type}
                    </td>
                    <td className="text-foreground max-w-md px-5 py-3 text-[0.8125rem] leading-snug">
                      {alert.message}
                    </td>
                    <td className="text-muted px-5 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                      {formatRelativeWib(alert.createdAt, now)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {alert.acknowledged ? (
                        <span className="text-dim text-xs">Acked</span>
                      ) : (
                        <button
                          type="button"
                          data-testid="btn-ack"
                          disabled={ackingId === alert.id}
                          onClick={() => void handleAck(alert)}
                          className={cn(
                            'bg-chip rounded-control text-foreground hover:bg-control-hover min-h-9 px-3.5 text-xs font-semibold transition-colors',
                            ackingId === alert.id && 'opacity-50'
                          )}
                        >
                          {ackingId === alert.id ? '…' : 'Ack'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

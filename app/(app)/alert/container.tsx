'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { EmptyState, formatRelativeWib } from '@/components/triage';
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

const SEV_BADGE: Record<string, string> = {
  CRITICAL: 'text-triage-red border-triage-red',
  WARNING: 'text-triage-yellow border-triage-yellow',
  INFO: 'text-muted border-border',
};

function severityClass(sev: string): string {
  return SEV_BADGE[sev] ?? SEV_BADGE.INFO;
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

  return (
    <div data-testid="page-alert" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Alert Center
          </h1>
          <p className="text-muted mt-1 text-base">
            Notifikasi kritis, peringatan, dan info sistem.
          </p>
        </div>
      </header>

      <div className="border-border bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              data-active={severity === s ? 'true' : undefined}
              className={cn(
                'border-border text-muted hover:bg-control-hover hover:text-foreground inline-flex min-h-11 items-center border px-3 text-sm font-medium transition-colors',
                severity === s &&
                  'border-accent bg-surface-muted text-accent'
              )}
            >
              {s === 'ALL' ? 'Semua' : s}
            </button>
          ))}
        </div>
        <span className="bg-border hidden h-8 w-px sm:block" aria-hidden />
        <div className="flex flex-wrap gap-2">
          {ACKED_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAcked(o.value)}
              data-active={acked === o.value ? 'true' : undefined}
              className={cn(
                'border-border text-muted hover:bg-control-hover hover:text-foreground inline-flex min-h-11 items-center border px-3 text-sm font-medium transition-colors',
                acked === o.value &&
                  'border-accent bg-surface-muted text-accent'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-card h-14 animate-pulse border"
            />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="border-triage-red bg-card border border-l-4 px-4 py-3 text-sm">
          <p className="text-triage-red text-base">
            Gagal memuat alert
            {error?.message ? `: ${error.message}` : ''}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-accent hover:opacity-90 mt-2 min-h-11 text-sm underline"
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
        <div className="border-border bg-card overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-border text-muted border-b text-sm font-semibold">
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Pesan</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Aksi</th>
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
                      alert.acknowledged && 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 border-l-2 pl-2 text-sm font-semibold',
                          severityClass(alert.severity)
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block size-2.5 shrink-0',
                            alert.severity === 'CRITICAL' && 'bg-triage-red',
                            alert.severity === 'WARNING' && 'bg-triage-yellow',
                            alert.severity !== 'CRITICAL' &&
                              alert.severity !== 'WARNING' &&
                              'bg-muted'
                          )}
                          aria-hidden
                        />
                        {alert.severity}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-3 font-mono text-sm">
                      {alert.type}
                    </td>
                    <td className="text-foreground max-w-md px-4 py-3 text-sm">
                      {alert.message}
                    </td>
                    <td className="text-muted px-4 py-3 font-mono text-sm tabular-nums whitespace-nowrap">
                      {formatRelativeWib(alert.createdAt, now)}
                    </td>
                    <td className="px-4 py-3">
                      {alert.acknowledged ? (
                        <span className="text-muted text-sm">Acked</span>
                      ) : (
                        <button
                          type="button"
                          data-testid="btn-ack"
                          disabled={ackingId === alert.id}
                          onClick={() => void handleAck(alert)}
                          className={cn(
                            'border-border bg-background text-foreground hover:border-accent hover:bg-control-hover hover:text-accent min-h-11 border px-3 text-sm font-medium transition-colors',
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

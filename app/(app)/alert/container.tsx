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
  CRITICAL: 'bg-triage-red/15 text-triage-red border-triage-red/40',
  WARNING: 'bg-triage-yellow/15 text-triage-yellow border-triage-yellow/40',
  INFO: 'bg-card text-muted border-border',
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
    <div data-testid="page-alert" className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Alert Center
          </h1>
          <p className="text-muted mt-1 text-sm">
            Notifikasi kritis, peringatan, dan info sistem.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              data-active={severity === s ? 'true' : undefined}
              className={cn(
                'border-border text-muted hover:text-foreground rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                severity === s &&
                  'border-accent/40 bg-accent/10 text-accent'
              )}
            >
              {s === 'ALL' ? 'Semua' : s}
            </button>
          ))}
        </div>
        <span className="text-border hidden sm:inline">|</span>
        <div className="flex flex-wrap gap-1.5">
          {ACKED_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAcked(o.value)}
              data-active={acked === o.value ? 'true' : undefined}
              className={cn(
                'border-border text-muted hover:text-foreground rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                acked === o.value &&
                  'border-accent/40 bg-accent/10 text-accent'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted text-sm">Memuat alert…</p>
      ) : null}

      {isError ? (
        <div className="border-triage-red/40 bg-triage-red/10 rounded-md border px-3 py-2 text-sm">
          <p className="text-triage-red">
            Gagal memuat alert
            {error?.message ? `: ${error.message}` : ''}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-accent mt-1 text-xs underline"
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
        <div className="border-border bg-card overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-border text-muted border-b text-[11px] tracking-wider uppercase">
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">Tipe</th>
                  <th className="px-3 py-2 font-medium">Pesan</th>
                  <th className="px-3 py-2 font-medium">Waktu</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
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
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                          severityClass(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="text-foreground px-3 py-2 font-mono text-xs">
                      {alert.type}
                    </td>
                    <td className="text-foreground max-w-[360px] px-3 py-2 text-xs">
                      {alert.message}
                    </td>
                    <td className="text-muted px-3 py-2 font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatRelativeWib(alert.createdAt, now)}
                    </td>
                    <td className="px-3 py-2">
                      {alert.acknowledged ? (
                        <span className="text-muted text-xs">Acked</span>
                      ) : (
                        <button
                          type="button"
                          data-testid="btn-ack"
                          disabled={ackingId === alert.id}
                          onClick={() => void handleAck(alert)}
                          className={cn(
                            'border-border bg-background text-foreground hover:border-accent/50 hover:text-accent rounded border px-2 py-1 text-xs font-medium transition-colors',
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

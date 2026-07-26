'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  EmptyState,
  PriorityBadge,
  VitalCell,
  formatRelativeWib,
  isStale,
} from '@/components/triage';
import {
  useActivity,
  useAlerts,
  useKpis,
  useNodes,
  useVictims,
} from '@/hooks/use-api';
import { cn } from '@/lib/cn';
import type { Node, Priority, Victim } from '@/types';

const PRIORITY_RANK: Record<Priority, number> = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  BLACK: 3,
};

function lastUpdateMs(v: Victim): number {
  const t = Date.parse(v.lastUpdate);
  return Number.isNaN(t) ? 0 : t;
}

function batteryClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted';
  if (pct <= 20) return 'text-triage-red';
  if (pct <= 40) return 'text-triage-yellow';
  return 'text-triage-green';
}

function NodeRow({ node, now }: { node: Node; now: number }) {
  const online = node.status === 'ONLINE';
  const rfid =
    node.currentVictim?.rfid ??
    (node.currentVictimId ? node.currentVictimId.slice(0, 8) : null);

  return (
    <li
      data-testid={`cmd-node-${node.id}`}
      data-status={node.status}
      className="border-border flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0"
    >
      <span
        className={cn(
          'size-2 shrink-0',
          online ? 'bg-triage-green' : 'bg-muted'
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-xs font-semibold">
          {node.name}
        </p>
        <p className="text-muted truncate font-mono text-[10px] tabular-nums">
          {node.id}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold',
          online
            ? 'border-triage-green/50 text-triage-green'
            : 'border-border text-muted'
        )}
      >
        {node.status}
      </span>
      <span
        className={cn(
          'w-10 shrink-0 text-right font-mono text-[11px] tabular-nums',
          batteryClass(node.battery)
        )}
      >
        {node.battery == null ? '-' : `${Math.round(node.battery)}%`}
      </span>
      <span className="text-muted w-20 shrink-0 truncate text-right font-mono text-[10px] tabular-nums">
        {rfid ?? '-'}
      </span>
      <span className="text-muted w-14 shrink-0 text-right font-mono text-[10px] tabular-nums">
        {formatRelativeWib(node.lastSeen, now)}
      </span>
    </li>
  );
}

function VictimCard({ victim, now }: { victim: Victim; now: number }) {
  const stale = isStale(victim.lastUpdate, 45_000, now);
  const isRed = victim.currentPriority === 'RED';

  return (
    <li
      data-testid={`cmd-victim-${victim.rfid}`}
      data-priority={victim.currentPriority}
      className={cn(
        'border-border rounded-sm border px-2 py-1.5',
        isRed && 'border-triage-red/60 bg-triage-red/5',
        stale && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2">
        <PriorityBadge priority={victim.currentPriority} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-xs font-semibold">
            {victim.name?.trim() ? victim.name : 'Belum terdaftar'}
          </p>
          <p className="text-muted font-mono text-[10px] tabular-nums">
            {victim.rfid}
          </p>
        </div>
        <span className="text-muted shrink-0 font-mono text-[10px] tabular-nums">
          {formatRelativeWib(victim.lastUpdate, now)}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        <VitalCell label="HR" value={victim.hr} unit="bpm" stale={stale} />
        <VitalCell label="SpO2" value={victim.spo2} unit="%" stale={stale} />
        <VitalCell label="RR" value={victim.rr} unit="/m" stale={stale} />
        <VitalCell
          label="Bat"
          value={victim.battery}
          unit="%"
          stale={stale}
        />
      </div>
    </li>
  );
}

function KpiCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="border-border bg-card flex min-w-0 flex-col justify-center border-r px-3 py-2 last:border-r-0">
      <span className="text-muted text-[10px] font-medium">{label}</span>
      <span
        className={cn(
          'mt-0.5 font-mono text-xl font-semibold tabular-nums tracking-tight',
          valueClass ?? 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function CommandContainer() {
  const router = useRouter();
  const { data: kpi } = useKpis();
  const { data: nodes, isLoading: nodesLoading } = useNodes();
  const { data: victims, isLoading: victimsLoading } = useVictims();
  const { data: activity, isLoading: activityLoading } = useActivity({
    limit: 20,
  });
  const { data: alerts } = useAlerts({ acked: false, limit: 50 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const criticalUnacked = useMemo(
    () =>
      (alerts ?? []).filter(
        (a) => !a.acknowledged && a.severity === 'CRITICAL'
      ),
    [alerts]
  );

  const sortedNodes = useMemo(() => {
    const list = (nodes ?? []).slice();
    list.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'ONLINE' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'id');
    });
    return list;
  }, [nodes]);

  const sortedVictims = useMemo(() => {
    const list = (victims ?? []).slice();
    list.sort((a, b) => {
      const pr =
        PRIORITY_RANK[a.currentPriority] - PRIORITY_RANK[b.currentPriority];
      if (pr !== 0) return pr;
      return lastUpdateMs(b) - lastUpdateMs(a);
    });
    return list;
  }, [victims]);

  const onlineNodes = kpi?.onlineNodes ?? 0;
  const totalNodes = kpi?.totalNodes ?? 0;

  return (
    <div
      data-testid="page-command"
      className="bg-background text-foreground flex h-dvh min-h-0 flex-col overflow-hidden"
    >
      <header className="border-border bg-card flex h-[var(--shell-header-height)] shrink-0 items-center justify-between gap-3 border-b px-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative block h-8 w-[9.5rem] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark-transparant.png"
              alt="TriageBox"
              width={152}
              height={32}
              className="absolute inset-0 h-8 w-auto max-w-[9.5rem] object-contain object-left dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-light-transparant.png"
              alt=""
              width={152}
              height={32}
              aria-hidden
              className="absolute inset-0 hidden h-8 w-auto max-w-[9.5rem] object-contain object-left dark:block"
            />
          </span>
          <div className="border-border min-w-0 border-l pl-3">
            <h1 className="text-foreground text-sm font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="text-muted text-[11px]">
              Live triage · Esc untuk keluar
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="cmd-exit"
          onClick={() => router.push('/')}
          className="border-border bg-background text-foreground hover:border-accent hover:text-accent shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          Keluar
        </button>
      </header>

      {criticalUnacked.length > 0 ? (
        <div
          data-testid="cmd-critical-banner"
          className="border-triage-red/50 bg-triage-red sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-white"
        >
          <p className="text-xs font-semibold">
            {criticalUnacked.length} alert critical belum di-ack
          </p>
          <Link
            href="/alert"
            className="rounded-sm bg-white/15 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/25"
          >
            Buka Alert
          </Link>
        </div>
      ) : null}

      <section
        data-testid="cmd-kpi"
        aria-label="KPI"
        className="border-border grid shrink-0 grid-cols-3 border-b sm:grid-cols-6"
      >
        <KpiCell label="Total" value={kpi?.total ?? 0} />
        <KpiCell
          label="Merah"
          value={kpi?.byPriority.RED ?? 0}
          valueClass="text-triage-red"
        />
        <KpiCell
          label="Kuning"
          value={kpi?.byPriority.YELLOW ?? 0}
          valueClass="text-triage-yellow"
        />
        <KpiCell
          label="Hijau"
          value={kpi?.byPriority.GREEN ?? 0}
          valueClass="text-triage-green"
        />
        <KpiCell
          label="Hitam"
          value={kpi?.byPriority.BLACK ?? 0}
          valueClass="text-foreground"
        />
        <KpiCell
          label="Node Online"
          value={`${onlineNodes}/${totalNodes}`}
          valueClass="text-triage-green"
        />
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-2 lg:grid-rows-1">
        <section
          data-testid="cmd-nodes"
          aria-label="Node"
          className="border-border flex min-h-0 flex-col border-b lg:border-r lg:border-b-0"
        >
          <div className="border-border bg-surface-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
            <h2 className="text-foreground text-xs font-semibold">Node</h2>
            <span className="text-muted font-mono text-[10px] tabular-nums">
              {sortedNodes.length}
            </span>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {nodesLoading && !nodes ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-3 py-2">
                  <div className="border-border bg-card h-8 animate-pulse rounded-md border" />
                </li>
              ))
            ) : sortedNodes.length === 0 ? (
              <li className="p-3">
                <EmptyState
                  title="Belum ada node"
                  description="Daftarkan node di Perangkat."
                />
              </li>
            ) : (
              sortedNodes.map((n) => (
                <NodeRow key={n.id} node={n} now={now} />
              ))
            )}
          </ul>
        </section>

        <section
          data-testid="cmd-victims"
          aria-label="Korban"
          className="border-border flex min-h-0 flex-col border-b lg:border-b-0"
        >
          <div className="border-border bg-surface-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
            <h2 className="text-foreground text-xs font-semibold">
              Korban · RED first
            </h2>
            <span className="text-muted font-mono text-[10px] tabular-nums">
              {sortedVictims.length}
            </span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {victimsLoading && !victims ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <div className="border-border bg-card h-14 animate-pulse rounded-md border" />
                </li>
              ))
            ) : sortedVictims.length === 0 ? (
              <li>
                <EmptyState
                  title="Belum ada korban"
                  description="Menunggu data node lapangan."
                />
              </li>
            ) : (
              sortedVictims.map((v) => (
                <VictimCard key={v.id} victim={v} now={now} />
              ))
            )}
          </ul>
        </section>
      </div>

      <section
        data-testid="cmd-activity"
        aria-label="Aktivitas"
        className="border-border flex h-36 shrink-0 flex-col border-t lg:h-40"
      >
        <div className="border-border bg-surface-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
          <h2 className="text-foreground text-xs font-semibold">Aktivitas</h2>
          <span className="text-muted font-mono text-[10px] tabular-nums">
            {(activity ?? []).length}
          </span>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {activityLoading && !activity ? (
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="px-3 py-1">
                <div className="border-border bg-card h-6 animate-pulse rounded-md border" />
              </li>
            ))
          ) : !activity || activity.length === 0 ? (
            <li className="text-muted px-3 py-4 text-center text-xs">
              Belum ada aktivitas
            </li>
          ) : (
            activity.map((item) => (
              <li
                key={item.id}
                data-testid="cmd-activity-item"
                className="border-border flex gap-2 border-b px-3 py-1 last:border-b-0"
              >
                <span className="text-muted w-16 shrink-0 font-mono text-[10px] tabular-nums">
                  {formatRelativeWib(item.createdAt, now)}
                </span>
                <span className="text-foreground min-w-0 flex-1 truncate text-[11px] leading-snug">
                  {item.message}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

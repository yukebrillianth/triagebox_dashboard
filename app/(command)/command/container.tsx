'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  EmptyState,
  EsiChip,
  PriorityBadge,
  VitalCell,
  formatRelativeWib,
  isStale,
  priorityRank,
  rrBandLabel,
} from '@/components/triage';
import {
  useActivity,
  useAlerts,
  useKpis,
  useNodes,
  useVictims,
} from '@/hooks/use-api';
import { cn } from '@/lib/cn';
import type { Node, VictimRow } from '@/types';

function lastUpdateMs(v: VictimRow): number {
  const t = Date.parse(v.lastUpdate);
  return Number.isNaN(t) ? 0 : t;
}

function batteryClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted';
  if (pct <= 20) return 'text-triage-red-ink';
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
      className="border-border grid grid-cols-[10px_1fr_78px_56px_88px_62px] items-center gap-3 border-b px-5 py-2.5 last:border-b-0"
    >
      <span
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          online ? 'bg-triage-green' : 'bg-muted'
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-foreground truncate text-[0.8125rem] font-semibold">
          {node.name}
        </span>
        <span className="text-muted truncate font-mono text-[0.6875rem] tabular-nums">
          {node.id}
        </span>
      </div>
      <span
        className={cn(
          'rounded-[5px] py-[3px] text-center font-mono text-[0.625rem] font-semibold tracking-[0.06em]',
          online
            ? 'bg-triage-green/15 text-triage-green'
            : // Not `bg-border`: muted on the light border color is only 4.42:1.
              'bg-chip text-muted'
        )}
      >
        {node.status}
      </span>
      <span
        className={cn(
          'text-right font-mono text-[0.6875rem] font-semibold tabular-nums',
          batteryClass(node.battery)
        )}
      >
        {node.battery == null ? '-' : `${Math.round(node.battery)}%`}
      </span>
      <span className="text-muted truncate text-right font-mono text-[0.6875rem] tabular-nums">
        {rfid ?? '-'}
      </span>
      <span className="text-dim text-right font-mono text-[0.6875rem] tabular-nums">
        {formatRelativeWib(node.lastSeen, now)}
      </span>
    </li>
  );
}

function VictimCard({
  victim,
  nodeName,
  now,
}: {
  victim: VictimRow;
  nodeName: string;
  now: number;
}) {
  const stale = isStale(victim.lastUpdate, 45_000, now);
  const isRed = victim.currentPriority === 'RED';

  return (
    <li
      data-testid={`cmd-victim-${victim.rfid}`}
      data-priority={victim.currentPriority}
      className={cn(
        'rounded-control px-3.5 py-3',
        // Staleness shows per-vital via `stale`; card opacity would push the
        // whole card below AA.
        isRed ? 'bg-triage-red/[0.11]' : 'bg-surface-muted',
        stale && 'ring-triage-yellow/40 ring-1 ring-inset'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 flex-col items-start gap-1">
          <PriorityBadge priority={victim.currentPriority} />
          <EsiChip esi={victim.esi} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-[0.8125rem] font-semibold">
            {victim.name?.trim() ? victim.name : 'Belum terdaftar'}
          </span>
          <span className="text-muted truncate font-mono text-[0.6875rem] tabular-nums">
            RFID {victim.rfid} · {nodeName}
          </span>
        </div>
        <span className="text-dim shrink-0 font-mono text-[0.6875rem] tabular-nums">
          {formatRelativeWib(victim.lastUpdate, now)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <VitalCell
          label="HR"
          value={victim.hr}
          kind="hr"
          size="md"
          stale={stale}
        />
        <VitalCell
          label="SpO2 (tren)"
          value={victim.spo2}
          unit="%"
          kind="spo2"
          size="md"
          stale={stale}
        />
        {/* No kind → no severity color: this is the operator's band answer. */}
        <VitalCell
          label="RR (operator)"
          value={rrBandLabel(victim.rr)}
          size="md"
          stale={stale}
        />
        <VitalCell
          label="Bat"
          value={victim.battery}
          unit="%"
          kind="battery"
          size="md"
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
    <div className="border-border flex min-w-0 flex-col justify-center gap-[3px] border-r px-5 py-3 last:border-r-0">
      <span className="text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-xl leading-none font-semibold tabular-nums',
          valueClass ?? 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Section head shared by the node, victim, and activity columns. */
function ColumnHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="bg-surface-header flex shrink-0 items-center justify-between px-5 py-2.5">
      <h2 className="text-foreground-soft text-xs font-semibold tracking-[0.06em] uppercase">
        {title}
      </h2>
      <span className="text-muted font-mono text-xs tabular-nums">{meta}</span>
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
      // priorityRank, not a Record lookup: currentPriority is nullable, and
      // `undefined - undefined` is NaN, which leaves the list unsorted.
      const pr =
        priorityRank(a.currentPriority) - priorityRank(b.currentPriority);
      if (pr !== 0) return pr;
      return lastUpdateMs(b) - lastUpdateMs(a);
    });
    return list;
  }, [victims]);

  const onlineNodes = kpi?.onlineNodes ?? 0;
  const totalNodes = kpi?.totalNodes ?? 0;

  const nodeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes ?? []) map.set(n.id, n.name || n.id);
    return map;
  }, [nodes]);

  return (
    <div
      data-testid="page-command"
      className="bg-background text-foreground flex h-dvh min-h-0 flex-col overflow-hidden"
    >
      <header className="bg-surface-sidebar flex h-[var(--shell-header-height)] shrink-0 items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative block h-[30px] w-[8.75rem] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark-transparant.png"
              alt="TriageBox"
              width={140}
              height={30}
              className="absolute inset-0 h-[30px] w-auto max-w-[8.75rem] object-contain object-left dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-light-transparant.png"
              alt=""
              width={140}
              height={30}
              aria-hidden
              className="absolute inset-0 hidden h-[30px] w-auto max-w-[8.75rem] object-contain object-left dark:block"
            />
          </span>
          <span
            className="bg-control-hover hidden h-[30px] w-px shrink-0 sm:block"
            aria-hidden
          />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-foreground truncate text-sm font-semibold">
              Command Center
            </h1>
            <p className="text-muted truncate text-[0.6875rem]">
              Live triage · Esc untuk keluar
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="cmd-exit"
          onClick={() => router.push('/')}
          className="bg-chip text-foreground hover:text-accent rounded-control shrink-0 px-4 py-2 text-xs font-semibold transition-colors"
        >
          Keluar
        </button>
      </header>

      {criticalUnacked.length > 0 ? (
        <div
          data-testid="cmd-critical-banner"
          className="bg-triage-red sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-2 text-white"
        >
          <p className="text-[0.8125rem] font-semibold">
            {criticalUnacked.length} alert critical belum di-ack
          </p>
          <Link
            href="/alert"
            className="rounded-[7px] bg-white/20 px-3.5 py-1.5 text-xs font-semibold hover:bg-white/30"
          >
            Buka Alert
          </Link>
        </div>
      ) : null}

      <section
        data-testid="cmd-kpi"
        aria-label="KPI"
        className="bg-surface-sidebar grid shrink-0 grid-cols-3 sm:grid-cols-6"
      >
        <KpiCell label="Total" value={kpi?.total ?? 0} />
        <KpiCell
          label="Merah"
          value={kpi?.byPriority.RED ?? 0}
          valueClass="text-triage-red-ink"
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
          <ColumnHead
            title="Node"
            meta={`${onlineNodes} / ${sortedNodes.length} online`}
          />
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {nodesLoading && !nodes ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-5 py-2">
                  <div className="bg-card h-8 animate-pulse rounded-md" />
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
              sortedNodes.map((n) => <NodeRow key={n.id} node={n} now={now} />)
            )}
          </ul>
        </section>

        <section
          data-testid="cmd-victims"
          aria-label="Korban"
          className="border-border flex min-h-0 flex-col border-b lg:border-b-0"
        >
          <ColumnHead
            title="Korban · RED first"
            meta={String(sortedVictims.length)}
          />
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {victimsLoading && !victims ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <div className="bg-card h-14 animate-pulse rounded-md" />
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
                <VictimCard
                  key={v.id}
                  victim={v}
                  nodeName={
                    v.currentNodeId
                      ? (nodeNameById.get(v.currentNodeId) ?? v.currentNodeId)
                      : '-'
                  }
                  now={now}
                />
              ))
            )}
          </ul>
        </section>
      </div>

      <section
        data-testid="cmd-activity"
        aria-label="Aktivitas"
        className="border-border flex h-36 shrink-0 flex-col border-t lg:h-[152px]"
      >
        <ColumnHead title="Aktivitas" meta={String((activity ?? []).length)} />
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {activityLoading && !activity ? (
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="px-5 py-1">
                <div className="bg-card h-6 animate-pulse rounded-md" />
              </li>
            ))
          ) : !activity || activity.length === 0 ? (
            <li className="text-muted px-5 py-4 text-center text-xs">
              Belum ada aktivitas
            </li>
          ) : (
            activity.map((item) => (
              <li
                key={item.id}
                data-testid="cmd-activity-item"
                className="border-border grid grid-cols-[84px_1fr] items-center gap-3.5 border-b px-5 py-[7px] last:border-b-0 sm:grid-cols-[84px_120px_1fr]"
              >
                <span className="text-dim font-mono text-[0.6875rem] tabular-nums">
                  {formatRelativeWib(item.createdAt, now)}
                </span>
                <span className="text-muted hidden truncate font-mono text-[0.6875rem] tabular-nums sm:block">
                  {item.type}
                </span>
                <span className="text-foreground min-w-0 truncate text-xs leading-snug">
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

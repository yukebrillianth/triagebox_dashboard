'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Search } from 'lucide-react';

import {
  EmptyState,
  EsiChip,
  PRIORITIES,
  PriorityBadge,
  StaleIndicator,
  VitalCell,
  formatBp,
  formatConfidence,
  formatRelativeWib,
  genderLabel,
  isStale,
  priorityRank,
  rrBandLabel,
} from '@/components/triage';
import { Chip } from '@/components/ui';
import { useNodes, useVictims } from '@/hooks/use-api';
import { useFlash } from '@/hooks/use-realtime';
import { cn } from '@/lib/cn';
import type { Priority, VictimRow } from '@/types';

const PAGE_SIZE = 25;

const PRIORITY_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const PRIORITY_TONE = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLACK: 'black',
} as const;

function lastUpdateMs(v: VictimRow): number {
  const t = Date.parse(v.lastUpdate);
  return Number.isNaN(t) ? 0 : t;
}

function VictimRowCells({
  victim,
  nodeName,
  now,
}: {
  victim: VictimRow;
  nodeName: string;
  now: number;
}) {
  const router = useRouter();
  const flashCreate = useFlash(`victim:${victim.id}:create`);
  const flashPriority = useFlash(`victim:${victim.id}:priority`);
  const flashing = flashCreate || flashPriority;
  const stale = isStale(victim.lastUpdate, 45_000, now);

  return (
    <tr
      data-testid={`victim-row-${victim.rfid}`}
      data-priority={victim.currentPriority}
      data-flash={flashing ? 'true' : undefined}
      onClick={() => router.push(`/pasien/${victim.id}`)}
      className={cn(
        'border-border hover:bg-control-hover cursor-pointer border-b transition-colors',
        // Stale rows are marked per-cell (dim vitals, yellow timestamp) rather
        // than with row opacity, which dropped the whole row below AA.
        // Design marks RED rows with an inset left bar rather than a border.
        victim.currentPriority === 'RED' &&
          'shadow-[inset_2px_0_0_var(--triage-red)]',
        flashing && 'bg-surface-muted outline-accent outline -outline-offset-2'
      )}
    >
      <td className="text-foreground w-24 px-5 py-3 font-mono text-[0.8125rem] tabular-nums">
        {victim.rfid}
      </td>
      <td className="text-foreground max-w-42 truncate px-3 py-3 text-[0.8125rem]">
        {victim.name?.trim() ? victim.name : 'Belum terdaftar'}
      </td>
      <td className="text-muted w-11 px-3 py-3 font-mono text-[0.8125rem] tabular-nums">
        {victim.age == null ? '-' : victim.age}
      </td>
      <td className="text-muted w-20 px-3 py-3 text-[0.8125rem]">
        {genderLabel(victim.gender)}
      </td>
      <td className="w-[74px] px-3 py-3 text-right">
        <VitalCell
          label="SpO2 (tren)"
          value={victim.spo2}
          unit="%"
          kind="spo2"
          variant="inline"
          stale={stale}
        />
      </td>
      <td className="w-[70px] px-3 py-3 text-right">
        <VitalCell
          label="HR"
          value={victim.hr}
          kind="hr"
          variant="inline"
          stale={stale}
        />
      </td>
      {/* No `kind`, so no clinical tone: the value is the band the operator
          tapped on the device, mapped back from the mid-point on the wire. */}
      <td className="w-[92px] px-3 py-3 text-right">
        <VitalCell
          label="RR (operator)"
          value={rrBandLabel(victim.rr)}
          variant="inline"
          stale={stale}
        />
      </td>
      <td className="text-muted w-[82px] px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
        {formatBp(victim.bpSys, victim.bpDia)}
      </td>
      <td className="w-[68px] px-3 py-3 text-right">
        <VitalCell
          label="Bat"
          value={victim.battery}
          unit="%"
          kind="battery"
          variant="inline"
          stale={stale}
        />
      </td>
      <td className="text-muted max-w-24 truncate px-3 py-3 font-mono text-xs">
        {nodeName}
      </td>
      <td className="px-3 py-3">
        {/* ESI under the badge, not a column of its own: it only means anything
            as provenance for that verdict — it is what tells two GREENs apart. */}
        <div className="flex flex-col items-start gap-1">
          <PriorityBadge priority={victim.currentPriority} />
          <EsiChip esi={victim.esi} />
        </div>
      </td>
      <td className="text-muted w-14 px-3 py-3 text-right font-mono text-xs tabular-nums">
        {formatConfidence(victim.confidence)}
      </td>
      <td className="px-5 py-3 text-right">
        <span
          className={cn(
            'block font-mono text-xs tabular-nums',
            stale ? 'text-triage-yellow' : 'text-muted'
          )}
        >
          {formatRelativeWib(victim.lastUpdate, now)}
        </span>
        <StaleIndicator lastUpdate={victim.lastUpdate} />
      </td>
    </tr>
  );
}

export function PasienContainer() {
  const { data: victims, isLoading, isError } = useVictims();
  const { data: nodes } = useNodes();

  const [search, setSearch] = useState('');
  const [priorities, setPriorities] = useState<Set<Priority>>(new Set());
  const [nodeId, setNodeId] = useState('');
  const [redFirst, setRedFirst] = useState(false);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nodeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes ?? []) map.set(n.id, n.name || n.id);
    return map;
  }, [nodes]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (victims ?? []).filter((v) => {
      if (nodeId && v.currentNodeId !== nodeId) return false;
      if (!q) return true;
      const name = (v.name ?? '').toLowerCase();
      return v.rfid.toLowerCase().includes(q) || name.includes(q);
    });
  }, [victims, search, nodeId]);

  // currentPriority is nullable (Priority?): victims without a verdict count
  // toward no chip — indexing Record<Priority, …> with null would make NaN.
  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = {
      RED: 0,
      YELLOW: 0,
      GREEN: 0,
      BLACK: 0,
    };
    for (const v of baseFiltered) {
      if (v.currentPriority) counts[v.currentPriority] += 1;
    }
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    let list =
      priorities.size === 0
        ? baseFiltered
        : baseFiltered.filter(
            (v) => v.currentPriority && priorities.has(v.currentPriority)
          );

    list = list.slice().sort((a, b) => {
      if (redFirst) {
        // priorityRank handles null (sorts last); a raw Record lookup on a
        // null key breaks the comparator silently.
        const ra = priorityRank(a.currentPriority);
        const rb = priorityRank(b.currentPriority);
        if (ra !== rb) return ra - rb;
      }
      return lastUpdateMs(b) - lastUpdateMs(a);
    });

    return list;
  }, [baseFiltered, priorities, redFirst]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  function togglePriority(p: Priority) {
    setPage(0);
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  if (isLoading && !victims) {
    return (
      <div data-testid="page-pasien" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Daftar Pasien
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Memuat data korban…
          </p>
        </header>
        <div className="bg-card rounded-card h-48 animate-pulse" />
      </div>
    );
  }

  if (isError && !victims) {
    return (
      <div data-testid="page-pasien" className="space-y-3.5">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Daftar Pasien
          </h1>
        </header>
        <EmptyState
          title="Gagal memuat pasien"
          description="Periksa koneksi ke backend, lalu muat ulang."
        />
      </div>
    );
  }

  const emptyAll = !victims || victims.length === 0;

  return (
    <div data-testid="page-pasien" className="space-y-3.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Daftar Pasien
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Live triage · {filtered.length} hasil
            {victims ? ` / ${victims.length} total` : ''}
          </p>
        </div>
        <Chip
          active={redFirst}
          tone="red"
          aria-pressed={redFirst}
          onClick={() => {
            setPage(0);
            setRedFirst((v) => !v);
          }}
        >
          <span
            className={cn(
              'inline-block size-2.5 shrink-0',
              redFirst ? 'bg-triage-red' : 'bg-control-hover'
            )}
            aria-hidden
          />
          Merah dulu
        </Chip>
      </header>

      <div className="bg-card rounded-card flex flex-wrap items-center gap-2.5 px-3.5 py-3">
        <div className="relative flex min-w-60 flex-1 items-center">
          <Search
            className="text-dim pointer-events-none absolute left-3.5 size-[15px]"
            aria-hidden
          />
          <input
            data-testid="filter-search"
            type="search"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Cari RFID atau nama korban…"
            className="bg-surface-input text-foreground rounded-control focus:bg-surface-header focus:ring-accent/50 h-11 w-full py-0 pr-24 pl-[38px] text-[0.8125rem] outline-none focus:ring-2 focus:ring-inset sm:h-10"
          />
          <span className="text-dim pointer-events-none absolute right-3.5 font-mono text-[0.6875rem] tabular-nums">
            {search ? '' : `${filtered.length} hasil`}
          </span>
          {search ? (
            <button
              type="button"
              onClick={() => {
                setPage(0);
                setSearch('');
              }}
              className="bg-control-hover text-muted hover:text-foreground absolute right-2.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-medium transition-colors"
            >
              Hapus
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRIORITIES.map((p) => (
            <Chip
              key={p}
              data-testid={`filter-priority-${p}`}
              data-active={priorities.has(p) ? 'true' : 'false'}
              active={priorities.has(p)}
              tone={PRIORITY_TONE[p]}
              onClick={() => togglePriority(p)}
            >
              {PRIORITY_LABELS[p]}
              <span className="font-mono tabular-nums opacity-70">
                {priorityCounts[p]}
              </span>
            </Chip>
          ))}
        </div>

        <select
          data-testid="filter-node"
          value={nodeId}
          onChange={(e) => {
            setPage(0);
            setNodeId(e.target.value);
          }}
          className="bg-surface-input text-foreground-soft rounded-control h-11 min-w-36 px-3.5 text-[0.8125rem] outline-none sm:h-[38px]"
        >
          <option value="">Semua node</option>
          {(nodes ?? []).map((n) => (
            <option key={n.id} value={n.id}>
              {n.name || n.id}
            </option>
          ))}
        </select>
      </div>

      {emptyAll ? (
        <EmptyState
          title="Belum ada korban"
          description={
            (nodes?.length ?? 0) === 0
              ? 'Belum ada node terdaftar. Daftarkan perangkat terlebih dahulu.'
              : 'Menunggu data node lapangan / simulator.'
          }
          action={
            (nodes?.length ?? 0) === 0 ? (
              <Link
                href="/perangkat"
                data-testid="cta-perangkat"
                className="bg-accent text-accent-foreground rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold hover:opacity-90"
              >
                Ke Perangkat
              </Link>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada hasil"
          description="Sesuaikan filter pencarian, prioritas, atau node."
        />
      ) : (
        <>
          <div className="bg-card rounded-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left">
                <thead className="bg-surface-header sticky top-0 z-10">
                  <tr className="text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                    <th className="w-24 px-5 py-2.5 font-semibold">RFID</th>
                    <th className="px-3 py-2.5 font-semibold">Nama</th>
                    <th className="w-11 px-3 py-2.5 font-semibold">Usia</th>
                    <th className="w-20 px-3 py-2.5 font-semibold">Gender</th>
                    <th className="w-[74px] px-3 py-2.5 text-right font-semibold">
                      SpO2 (tren)
                    </th>
                    <th className="w-[70px] px-3 py-2.5 text-right font-semibold">
                      HR
                    </th>
                    <th
                      className="w-[92px] px-3 py-2.5 text-right font-semibold"
                      title="Band pernapasan yang diisi operator di perangkat, bukan hasil mikrofon"
                    >
                      RR (operator)
                    </th>
                    <th className="w-[82px] px-3 py-2.5 text-right font-semibold">
                      BP (prediksi ML)
                    </th>
                    <th className="w-[68px] px-3 py-2.5 text-right font-semibold">
                      Bat
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Node</th>
                    <th className="px-3 py-2.5 font-semibold">Prioritas</th>
                    <th className="w-14 px-3 py-2.5 text-right font-semibold">
                      Conf
                    </th>
                    <th className="px-5 py-2.5 text-right font-semibold">
                      Update
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((v) => (
                    <VictimRowCells
                      key={v.id}
                      victim={v}
                      nodeName={
                        v.currentNodeId
                          ? (nodeNameById.get(v.currentNodeId) ??
                            v.currentNodeId)
                          : '-'
                      }
                      now={now}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Design keeps pagination as a footer bar inside the card. */}
            <div className="bg-surface-header text-muted flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs">
              <span className="font-mono tabular-nums">
                {safePage * PAGE_SIZE + 1}–
                {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} /{' '}
                {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="bg-chip rounded-control text-muted hover:text-accent h-11 px-3.5 text-[0.8125rem] font-semibold transition-colors disabled:opacity-40 sm:h-[34px]"
                >
                  Prev
                </button>
                <span className="font-mono text-[0.8125rem] tabular-nums">
                  {safePage + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  className="bg-chip rounded-control text-muted hover:text-accent h-11 px-3.5 text-[0.8125rem] font-semibold transition-colors disabled:opacity-40 sm:h-[34px]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

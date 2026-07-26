'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  EmptyState,
  PriorityBadge,
  StaleIndicator,
  VitalCell,
  formatBp,
  formatConfidence,
  formatRelativeWib,
  genderLabel,
  isStale,
} from '@/components/triage';
import { useNodes, useVictims } from '@/hooks/use-api';
import { useFlash } from '@/hooks/use-realtime';
import { cn } from '@/lib/cn';
import type { Priority, Victim } from '@/types';

const PAGE_SIZE = 25;

const PRIORITIES: Priority[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

const PRIORITY_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const PRIORITY_RANK: Record<Priority, number> = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  BLACK: 3,
};

const PRIORITY_CHIP: Record<Priority, string> = {
  RED: 'border-triage-red data-[active=true]:border-l-triage-red data-[active=true]:text-triage-red data-[active=true]:bg-surface-muted',
  YELLOW:
    'border-triage-yellow data-[active=true]:border-l-triage-yellow data-[active=true]:text-triage-yellow data-[active=true]:bg-surface-muted',
  GREEN:
    'border-triage-green data-[active=true]:border-l-triage-green data-[active=true]:text-triage-green data-[active=true]:bg-surface-muted',
  BLACK:
    'border-border data-[active=true]:bg-surface-muted data-[active=true]:text-foreground',
};

function lastUpdateMs(v: Victim): number {
  const t = Date.parse(v.lastUpdate);
  return Number.isNaN(t) ? 0 : t;
}

function VictimRow({
  victim,
  nodeName,
  now,
}: {
  victim: Victim;
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
        stale && 'opacity-60',
        flashing && 'bg-surface-muted outline-accent outline outline-2 -outline-offset-2'
      )}
    >
      <td className="px-3 py-3 font-mono text-sm tabular-nums">
        {victim.rfid}
      </td>
      <td className="max-w-40 truncate px-3 py-3 text-sm">
        {victim.name?.trim() ? victim.name : 'Belum terdaftar'}
      </td>
      <td className="px-3 py-3 text-sm tabular-nums">
        {victim.age == null ? '-' : victim.age}
      </td>
      <td className="px-3 py-3 text-sm">{genderLabel(victim.gender)}</td>
      <td className="px-3 py-3">
        <VitalCell label="SpO2" value={victim.spo2} unit="%" stale={stale} />
      </td>
      <td className="px-3 py-3">
        <VitalCell label="HR" value={victim.hr} unit="bpm" stale={stale} />
      </td>
      <td className="px-3 py-3">
        <VitalCell label="RR" value={victim.rr} unit="/m" stale={stale} />
      </td>
      <td className="px-3 py-3 font-mono text-sm tabular-nums">
        {formatBp(victim.bpSys, victim.bpDia)}
      </td>
      <td className="px-3 py-3">
        <VitalCell
          label="Bat"
          value={victim.battery}
          unit="%"
          stale={stale}
        />
      </td>
      <td className="max-w-28 truncate px-3 py-3 text-sm">
        {nodeName}
      </td>
      <td className="px-3 py-3">
        <PriorityBadge priority={victim.currentPriority} />
      </td>
      <td className="px-3 py-3 font-mono text-sm tabular-nums">
        {formatConfidence(victim.confidence)}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted font-mono text-sm tabular-nums">
            {formatRelativeWib(victim.lastUpdate, now)}
          </span>
          <StaleIndicator lastUpdate={victim.lastUpdate} />
        </div>
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

  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = {
      RED: 0,
      YELLOW: 0,
      GREEN: 0,
      BLACK: 0,
    };
    for (const v of baseFiltered) {
      counts[v.currentPriority] += 1;
    }
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    let list =
      priorities.size === 0
        ? baseFiltered
        : baseFiltered.filter((v) => priorities.has(v.currentPriority));

    list = list.slice().sort((a, b) => {
      if (redFirst) {
        const ra = PRIORITY_RANK[a.currentPriority];
        const rb = PRIORITY_RANK[b.currentPriority];
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
      <div data-testid="page-pasien" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Daftar Pasien
          </h1>
          <p className="text-muted mt-1 text-base">Memuat data korban…</p>
        </header>
        <div className="border-border bg-card h-48 animate-pulse border" />
      </div>
    );
  }

  if (isError && !victims) {
    return (
      <div data-testid="page-pasien" className="space-y-6 md:space-y-8">
        <header>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
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
    <div data-testid="page-pasien" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Daftar Pasien
          </h1>
          <p className="text-muted mt-1 text-base">
            Live triage · {filtered.length} hasil
            {victims ? ` / ${victims.length} total` : ''}
          </p>
        </div>
        <label className="text-muted flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={redFirst}
            onChange={(e) => {
              setPage(0);
              setRedFirst(e.target.checked);
            }}
            className="accent-accent size-4"
          />
          Merah dulu
        </label>
      </header>

      <div className="border-border bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          data-testid="filter-search"
          type="search"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          placeholder="Cari RFID / nama…"
          className="border-border bg-background text-foreground placeholder:text-muted focus:border-accent min-h-11 min-w-0 flex-1 border px-3 text-sm outline-none sm:min-w-44"
        />

        <div className="flex flex-wrap items-center gap-2">
          {PRIORITIES.map((p) => {
            const active = priorities.has(p);
            return (
              <button
                key={p}
                type="button"
                data-testid={`filter-priority-${p}`}
                data-active={active ? 'true' : 'false'}
                onClick={() => togglePriority(p)}
                className={cn(
                  'border text-muted hover:bg-control-hover inline-flex min-h-11 items-center gap-2 border-l-4 px-3 py-2 text-sm font-semibold transition-colors',
                  PRIORITY_CHIP[p],
                  !active && 'border-l-border'
                )}
              >
                {PRIORITY_LABELS[p]}
                <span className="font-mono tabular-nums opacity-80">
                  {priorityCounts[p]}
                </span>
              </button>
            );
          })}
        </div>

        <select
          data-testid="filter-node"
          value={nodeId}
          onChange={(e) => {
            setPage(0);
            setNodeId(e.target.value);
          }}
          className="border-border bg-background text-foreground min-h-11 min-w-36 border px-3 text-sm outline-none"
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
                className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold"
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
          <div className="border-border overflow-x-auto border">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr className="border-border text-muted border-b text-sm font-semibold">
                  <th className="px-3 py-3">RFID</th>
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Usia</th>
                  <th className="px-3 py-3">Gender</th>
                  <th className="px-3 py-3">SpO2</th>
                  <th className="px-3 py-3">HR</th>
                  <th className="px-3 py-3">RR</th>
                  <th className="px-3 py-3">BP</th>
                  <th className="px-3 py-3">Battery</th>
                  <th className="px-3 py-3">Node</th>
                  <th className="px-3 py-3">Prioritas</th>
                  <th className="px-3 py-3">Conf</th>
                  <th className="px-3 py-3">Last Update</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => (
                  <VictimRow
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

          <div className="text-muted flex flex-wrap items-center justify-between gap-3 text-sm">
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
                className="border-border bg-card text-foreground hover:bg-control-hover disabled:text-muted min-h-11 border px-4 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums">
                {safePage + 1}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                className="border-border bg-card text-foreground hover:bg-control-hover disabled:text-muted min-h-11 border px-4 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

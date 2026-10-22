'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';

import { EmptyState, VitalCell, formatRelativeWib } from '@/components/triage';
import {
  Button,
  Chip,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import {
  queryKeys,
  useNodes,
  usePendingStations,
  useStations,
} from '@/hooks/use-api';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage, getValidationErrors } from '@/lib/http-error';
import {
  adoptStationSchema,
  editStationSchema,
  type AdoptStationForm,
  type AdoptStationFormValues,
  type EditStationForm,
  type EditStationFormValues,
} from '@/schemas/device';
import type { OnlineStatus, PendingStation, Station } from '@/types';

type Tab = 'station' | 'node';

function StatusPill({ status }: { status: OnlineStatus | string }) {
  const online = status === 'ONLINE';
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold',
        online ? 'text-triage-green' : 'text-dim'
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0',
          online ? 'bg-triage-green' : 'bg-control-hover'
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

/**
 * Edit only, and only name + notes.
 *
 * There is no "Tambah Station": a station registers itself by announcing, and
 * the operator turns the candidate into a real station in the adoption block
 * above — that is where its id comes from. IP and firmware arrive on the same
 * announce, and the broker address is the backend's `MQTT_URL`, so none of them
 * are the operator's to type.
 */
function StationEditDialog({
  station,
  onClose,
  onSaved,
}: {
  station: Station;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<EditStationFormValues, unknown, EditStationForm>({
    resolver: zodResolver(editStationSchema),
    defaultValues: {
      name: station.name,
      notes: station.notes ?? '',
    },
  });

  useEffect(() => {
    form.reset({ name: station.name, notes: station.notes ?? '' });
  }, [station, form]);

  async function onSubmit(values: EditStationForm) {
    try {
      await api.patchStation(station.id, {
        name: values.name.trim(),
        notes: values.notes ?? null,
      });
      toast.success('Station diperbarui');
      onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          form.setError(field as keyof EditStationFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  const errors = form.formState.errors;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit Station"
      description={station.id}
      data-testid="dialog-station"
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field
          label="Nama"
          htmlFor="station-name"
          required
          error={errors.name?.message}
        >
          <Input
            id="station-name"
            data-testid="input-station-name"
            maxLength={128}
            {...form.register('name')}
          />
        </Field>

        <Field label="Catatan" htmlFor="station-notes">
          <Textarea
            id="station-notes"
            data-testid="input-station-notes"
            rows={2}
            maxLength={1024}
            {...form.register('notes')}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-save-station"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function AdoptStationDialog({
  pending,
  onClose,
  onSaved,
}: {
  pending: PendingStation | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const form = useForm<AdoptStationFormValues, unknown, AdoptStationForm>({
    resolver: zodResolver(adoptStationSchema),
    defaultValues: { id: '', name: '', nodeCount: 0, nodeIdBase: 0 },
  });

  useEffect(() => {
    if (!pending) return;
    form.reset({
      id: pending.announcedStationId,
      name: pending.announcedStationId,
      nodeCount: pending.nodeCount ?? 0,
      nodeIdBase: 0,
    });
  }, [pending, form]);

  async function onSubmit(values: AdoptStationForm) {
    if (!pending) return;
    try {
      await api.adoptStation({
        mac: pending.mac,
        id: values.id.trim(),
        name: values.name.trim(),
        nodeCount: values.nodeCount,
        nodeIdBase: values.nodeIdBase,
      });
      toast.success(`Station ${values.id} diadopsi`);
      await onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          form.setError(field as keyof AdoptStationFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  const errors = form.formState.errors;

  return (
    <Dialog
      open={pending !== null}
      onClose={onClose}
      title="Adopsi station"
      data-testid="dialog-adopt-station"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
        <p className="text-muted text-[0.8125rem]">
          MAC <span className="font-mono">{pending?.mac}</span>
          {pending?.ip ? (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              <span className="font-mono">{pending.ip}</span>
            </>
          ) : null}
        </p>
        <Field label="Station ID" error={errors.id?.message}>
          <Input {...form.register('id')} data-testid="adopt-station-id" />
        </Field>
        <Field label="Nama" error={errors.name?.message}>
          <Input {...form.register('name')} data-testid="adopt-station-name" />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Jumlah node" error={errors.nodeCount?.message}>
            <Input
              type="number"
              min={0}
              max={255}
              {...form.register('nodeCount')}
              data-testid="adopt-node-count"
            />
          </Field>
          <Field
            label="Offset ID node"
            hint="0 → node-01. Pakai 20 untuk station kedua agar tidak bentrok."
            error={errors.nodeIdBase?.message}
          >
            <Input
              type="number"
              min={0}
              max={255}
              {...form.register('nodeIdBase')}
              data-testid="adopt-node-base"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-confirm-adopt"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Mengadopsi…' : 'Adopsi'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function PerangkatContainer() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('station');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [stationFilter, setStationFilter] = useState('');
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [adoptTarget, setAdoptTarget] = useState<PendingStation | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const listParams = useMemo(
    () => (includeInactive ? { includeInactive: true } : undefined),
    [includeInactive]
  );

  const {
    data: stations,
    isLoading: stationsLoading,
    isError: stationsError,
  } = useStations(listParams);

  const nodeParams = useMemo(
    () => ({
      ...(includeInactive ? { includeInactive: true } : {}),
      ...(stationFilter ? { stationId: stationFilter } : {}),
    }),
    [includeInactive, stationFilter]
  );

  const {
    data: nodes,
    isLoading: nodesLoading,
    isError: nodesError,
  } = useNodes(nodeParams);

  // Active station list for the node filter dropdown (stationFilter may point
  // at an inactive station while includeInactive is on, hence the merge).
  const { data: activeStations } = useStations();

  const { data: pendingStations } = usePendingStations();
  const pendingRows = pendingStations ?? [];

  async function invalidateDevices() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.stations.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stations.pending }),
    ]);
  }

  async function handleDismissPending(p: PendingStation) {
    if (
      !window.confirm(
        `Abaikan station ${p.announcedStationId} (${p.mac})? Ia akan muncul lagi saat station itu terhubung ulang.`
      )
    ) {
      return;
    }
    try {
      await api.dismissPendingStation(p.mac);
      toast.success('Kandidat diabaikan');
      await invalidateDevices();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDeleteStation(s: Station) {
    if (
      !window.confirm(`Nonaktifkan station "${s.name}" (${s.id})? Soft-delete.`)
    ) {
      return;
    }
    try {
      await api.deleteStation(s.id);
      toast.success('Station dinonaktifkan');
      await invalidateDevices();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const stationNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations ?? []) map.set(s.id, s.name || s.id);
    for (const s of activeStations ?? []) {
      if (!map.has(s.id)) map.set(s.id, s.name || s.id);
    }
    return map;
  }, [stations, activeStations]);

  const stationRows = stations ?? [];
  const nodeRows = nodes ?? [];

  return (
    <div data-testid="page-perangkat" className="space-y-3.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Perangkat
          </h1>
          <p className="text-muted mt-1 text-[0.8125rem] sm:text-sm">
            Station &amp; node lapangan · live status
          </p>
        </div>
        <Chip
          active={includeInactive}
          aria-pressed={includeInactive}
          onClick={() => setIncludeInactive((v) => !v)}
        >
          <span
            data-testid="toggle-include-inactive"
            className={cn(
              'inline-block size-2.5 shrink-0',
              includeInactive ? 'bg-accent' : 'bg-control-hover'
            )}
            aria-hidden
          />
          Tampilkan nonaktif
        </Chip>
      </header>

      {/* Adoption candidates. Rendered above the tabs and only when non-empty:
          an unregistered station has all of its data dropped, so this is the one
          thing on the page that must not be behind a tab. */}
      {pendingRows.length > 0 ? (
        <section
          data-testid="pending-stations"
          className="bg-card rounded-card overflow-hidden"
        >
          <header className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
            <div className="min-w-0">
              <h2 className="text-foreground text-sm font-semibold">
                Menunggu adopsi
                <span className="text-triage-yellow ml-2 font-mono tabular-nums">
                  {pendingRows.length}
                </span>
              </h2>
              <p className="text-muted mt-0.5 text-xs">
                Station ini mengirim data tapi belum terdaftar — semua paketnya
                dibuang sampai diadopsi.
              </p>
            </div>
          </header>
          <ul className="divide-border divide-y">
            {pendingRows.map((p) => (
              <li
                key={p.mac}
                data-testid="pending-station-row"
                className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5"
              >
                <span className="text-foreground min-w-0 flex-1 font-mono text-[0.8125rem] font-semibold">
                  {p.announcedStationId}
                </span>
                <span className="text-muted font-mono text-xs">{p.mac}</span>
                <span className="text-muted font-mono text-xs tabular-nums">
                  {p.ip ?? '-'}
                </span>
                <span className="text-dim text-xs">{p.firmware ?? '-'}</span>
                <span className="text-muted text-xs tabular-nums">
                  {p.nodeCount ?? 0} node
                </span>
                <span className="text-dim text-xs tabular-nums">
                  {formatRelativeWib(p.lastSeen, now)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Button
                    data-testid="btn-adopt-station"
                    onClick={() => setAdoptTarget(p)}
                  >
                    Adopsi
                  </Button>
                  <Button
                    variant="ghost"
                    data-testid="btn-dismiss-pending"
                    onClick={() => void handleDismissPending(p)}
                  >
                    Abaikan
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="bg-card rounded-card flex flex-wrap items-center gap-1.5 px-3.5 py-3">
        <Chip
          data-testid="tab-station"
          data-active={tab === 'station' ? 'true' : 'false'}
          active={tab === 'station'}
          onClick={() => setTab('station')}
        >
          Station
          <span className="font-mono tabular-nums opacity-70">
            {stationRows.length}
          </span>
        </Chip>
        <Chip
          data-testid="tab-node"
          data-active={tab === 'node' ? 'true' : 'false'}
          active={tab === 'node'}
          onClick={() => setTab('node')}
        >
          Node
          <span className="font-mono tabular-nums opacity-70">
            {nodeRows.length}
          </span>
        </Chip>
      </div>

      {tab === 'station' ? (
        <section className="space-y-3.5">
          <p className="text-muted text-[0.8125rem]">
            Station mendaftar lewat announce; node dibuat backend saat adopsi
            (`node-01…`, offset di tabel adopsi).
          </p>

          {stationsLoading && !stations ? (
            <div className="bg-card rounded-card h-40 animate-pulse" />
          ) : stationsError && !stations ? (
            <EmptyState
              title="Gagal memuat station"
              description="Periksa koneksi backend."
            />
          ) : stationRows.length === 0 ? (
            <EmptyState
              title="Belum ada station"
              description="Nyalakan station — ia muncul di 'Menunggu adopsi' untuk diadopsi."
            />
          ) : (
            <div className="bg-card rounded-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left">
                  <thead className="bg-surface-header sticky top-0 z-10">
                    <tr className="text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                      <th className="px-5 py-2.5 font-semibold">ID</th>
                      <th className="px-3 py-2.5 font-semibold">Nama</th>
                      <th className="px-3 py-2.5 font-semibold">Pos</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Poll</th>
                      <th className="px-3 py-2.5 font-semibold">IP</th>
                      <th className="px-3 py-2.5 font-semibold">Firmware</th>
                      <th className="px-3 py-2.5 font-semibold">Last Seen</th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Nodes
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Aktif</th>
                      <th className="px-5 py-2.5 text-right font-semibold">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationRows.map((s) => (
                      <tr
                        key={s.id}
                        data-testid={`station-row-${s.id}`}
                        className={cn(
                          'border-border hover:bg-control-hover border-b last:border-b-0',
                          // Inactive is stated in the "Aktif" column; opacity
                          // here pushed the row text below AA.
                          !s.isActive && 'bg-surface-header/40'
                        )}
                      >
                        <td className="text-foreground px-5 py-3 font-mono text-xs tabular-nums">
                          {s.id}
                        </td>
                        <td className="text-foreground max-w-40 truncate px-3 py-3 text-[0.8125rem]">
                          {s.name}
                        </td>
                        {/* Post identity (brief butir 9), optional until the
                            backend ships the fields. */}
                        <td className="text-muted max-w-40 truncate px-3 py-3 text-[0.8125rem]">
                          {s.postName ?? '-'}
                          {s.locationLabel ? (
                            <span className="text-dim block text-xs">
                              {s.locationLabel}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={s.status} />
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs tabular-nums">
                          {s.pollPeriodSec != null
                            ? `${s.pollPeriodSec}s`
                            : '-'}
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs tabular-nums">
                          {s.ipAddress ?? '-'}
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs">
                          {s.firmware ?? '-'}
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs tabular-nums">
                          {formatRelativeWib(s.lastSeen, now)}
                        </td>
                        <td className="text-muted px-3 py-3 text-right font-mono text-xs tabular-nums">
                          {s.nodeCount ?? 0}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {s.isActive ? (
                            <span className="text-triage-green">Ya</span>
                          ) : (
                            <span className="text-dim">Tidak</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              data-testid={`btn-edit-station-${s.id}`}
                              onClick={() => setEditStation(s)}
                            >
                              Edit
                            </Button>
                            {s.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`btn-delete-station-${s.id}`}
                                onClick={() => handleDeleteStation(s)}
                                className="text-muted hover:text-triage-red-ink"
                              >
                                Hapus
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* No create/edit/delete: node ids are generated by the backend at
                adoption (`node-${nodeIdBase + i + 1}`) and the station firmware
                maps the binary node_id to exactly that string, so a hand-typed
                id can never receive a packet. Soft-delete is undone by the next
                vital (ingest reactivates the node), so it was a lie too. */}
            <p className="text-muted text-[0.8125rem]">
              Node LoRa · RSSI / SNR / bat · dibuat backend saat adopsi
            </p>
            <Select
              data-testid="filter-node-station"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="min-w-36 sm:w-auto"
            >
              <option value="">Semua station</option>
              {(stations ?? activeStations ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          {nodesLoading && !nodes ? (
            <div className="bg-card rounded-card h-40 animate-pulse" />
          ) : nodesError && !nodes ? (
            <EmptyState
              title="Gagal memuat node"
              description="Periksa koneksi backend."
            />
          ) : nodeRows.length === 0 ? (
            <EmptyState
              title="Belum ada node"
              description="Node muncul setelah station diadopsi dengan jumlah node-nya."
            />
          ) : (
            <div className="bg-card rounded-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead className="bg-surface-header sticky top-0 z-10">
                    <tr className="text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                      <th className="px-5 py-2.5 font-semibold">ID</th>
                      <th className="px-3 py-2.5 font-semibold">Station</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        RSSI
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        SNR
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Bat
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Firmware</th>
                      <th
                        className="px-3 py-2.5 text-right font-semibold"
                        title="Paket diterima / diharapkan, dan persen loss"
                      >
                        Packets
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Last Seen</th>
                      <th className="px-3 py-2.5 font-semibold">Victim</th>
                      <th className="px-5 py-2.5 font-semibold">Aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodeRows.map((n) => (
                      <tr
                        key={n.id}
                        data-testid={`node-row-${n.id}`}
                        className={cn(
                          'border-border hover:bg-control-hover border-b last:border-b-0',
                          // Inactive is stated in the "Aktif" column; opacity
                          // here pushed the row text below AA.
                          !n.isActive && 'bg-surface-header/40'
                        )}
                      >
                        <td className="px-5 py-3">
                          <span className="text-foreground block font-mono text-xs tabular-nums">
                            {n.id}
                          </span>
                          <span className="text-dim block truncate text-[0.6875rem]">
                            {n.name}
                          </span>
                        </td>
                        <td className="text-muted max-w-32 truncate px-3 py-3 text-[0.8125rem]">
                          {n.station?.name ??
                            stationNameById.get(n.stationId) ??
                            n.stationId}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={n.status} />
                        </td>
                        <td className="text-muted px-3 py-3 text-right font-mono text-xs tabular-nums">
                          {n.rssi == null ? '-' : n.rssi}
                        </td>
                        <td className="text-muted px-3 py-3 text-right font-mono text-xs tabular-nums">
                          {n.snr == null ? '-' : n.snr}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <VitalCell
                            label="Bat"
                            value={n.battery}
                            kind="battery"
                            variant="inline"
                          />
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs">
                          {n.firmware ?? '-'}
                        </td>
                        {/* received/expected + loss% (brief butir 9/10): the
                            article needs packet-loss numbers per node. */}
                        <td className="text-muted px-3 py-3 text-right font-mono text-xs tabular-nums">
                          {n.expectedPackets != null
                            ? `${n.packetCount ?? 0}/${n.expectedPackets}`
                            : (n.packetCount ?? 0)}
                          {n.packetLossPct != null ? (
                            <span
                              className={cn(
                                'ml-1.5',
                                n.packetLossPct > 5
                                  ? 'text-triage-yellow'
                                  : 'text-dim'
                              )}
                            >
                              {n.packetLossPct}%
                            </span>
                          ) : null}
                        </td>
                        <td className="text-muted px-3 py-3 font-mono text-xs tabular-nums">
                          {formatRelativeWib(n.lastSeen, now)}
                        </td>
                        <td className="text-muted max-w-28 truncate px-3 py-3 font-mono text-xs tabular-nums">
                          {n.currentVictimId ??
                            n.currentVictim?.id ??
                            n.currentVictim?.rfid ??
                            '-'}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {n.isActive ? (
                            <span className="text-triage-green">Ya</span>
                          ) : (
                            <span className="text-dim">Tidak</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {editStation ? (
        <StationEditDialog
          station={editStation}
          onClose={() => setEditStation(null)}
          onSaved={invalidateDevices}
        />
      ) : null}

      {adoptTarget ? (
        <AdoptStationDialog
          pending={adoptTarget}
          onClose={() => setAdoptTarget(null)}
          onSaved={invalidateDevices}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { EmptyState, formatRelativeWib } from '@/components/triage';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { queryKeys, useNodes, useStations } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage, getValidationErrors } from '@/lib/http-error';
import {
  createNodeSchema,
  createStationSchema,
  editNodeSchema,
  editStationSchema,
  type CreateNodeForm,
  type CreateNodeFormValues,
  type CreateStationForm,
  type CreateStationFormValues,
  type EditNodeForm,
  type EditNodeFormValues,
  type EditStationForm,
  type EditStationFormValues,
} from '@/schemas/device';
import type { Node, OnlineStatus, Station } from '@/types';

type Tab = 'station' | 'node';
type StationDialog =
  | { mode: 'create' }
  | { mode: 'edit'; station: Station }
  | null;
type NodeDialog =
  | { mode: 'create' }
  | { mode: 'edit'; node: Node }
  | null;

function StatusPill({ status }: { status: OnlineStatus | string }) {
  const online = status === 'ONLINE';
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-2 border-l-2 pl-2 text-sm font-semibold',
        online
          ? 'border-triage-green text-triage-green'
          : 'border-border text-muted'
      )}
    >
      <span
        className={cn(
          'size-2.5 shrink-0',
          online ? 'bg-triage-green' : 'bg-muted'
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

function mqttLabel(s: Station): string {
  const host = s.mqttBrokerHost?.trim();
  if (!host) return '-';
  const port = s.mqttBrokerPort != null ? String(s.mqttBrokerPort) : '-';
  return `${host}:${port}`;
}

function StationFormDialog({
  dialog,
  onClose,
  onSaved,
}: {
  dialog: NonNullable<StationDialog>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = dialog.mode === 'create';
  const station = dialog.mode === 'edit' ? dialog.station : null;

  const createForm = useForm<CreateStationFormValues, unknown, CreateStationForm>({
    resolver: zodResolver(createStationSchema),
    defaultValues: {
      id: '',
      name: '',
      firmware: '',
      ipAddress: '',
      mqttBrokerHost: '',
      mqttBrokerPort: '',
      notes: '',
    },
  });

  const editForm = useForm<EditStationFormValues, unknown, EditStationForm>({
    resolver: zodResolver(editStationSchema),
    defaultValues: {
      name: station?.name ?? '',
      firmware: station?.firmware ?? '',
      ipAddress: station?.ipAddress ?? '',
      mqttBrokerHost: station?.mqttBrokerHost ?? '',
      mqttBrokerPort:
        station?.mqttBrokerPort != null ? station.mqttBrokerPort : '',
      notes: station?.notes ?? '',
    },
  });

  useEffect(() => {
    if (dialog.mode === 'edit') {
      editForm.reset({
        name: dialog.station.name,
        firmware: dialog.station.firmware ?? '',
        ipAddress: dialog.station.ipAddress ?? '',
        mqttBrokerHost: dialog.station.mqttBrokerHost ?? '',
        mqttBrokerPort:
          dialog.station.mqttBrokerPort != null
            ? dialog.station.mqttBrokerPort
            : '',
        notes: dialog.station.notes ?? '',
      });
    }
  }, [dialog, editForm]);

  async function onCreate(values: CreateStationForm) {
    try {
      await api.createStation({
        id: values.id.trim(),
        name: values.name.trim(),
        firmware: values.firmware ?? null,
        ipAddress: values.ipAddress ?? null,
        mqttBrokerHost: values.mqttBrokerHost ?? null,
        mqttBrokerPort: values.mqttBrokerPort ?? null,
        notes: values.notes ?? null,
      });
      toast.success('Station dibuat');
      onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          createForm.setError(field as keyof CreateStationFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  async function onEdit(values: EditStationForm) {
    if (!station) return;
    try {
      await api.patchStation(station.id, {
        name: values.name.trim(),
        firmware: values.firmware ?? null,
        ipAddress: values.ipAddress ?? null,
        mqttBrokerHost: values.mqttBrokerHost ?? null,
        mqttBrokerPort: values.mqttBrokerPort ?? null,
        notes: values.notes ?? null,
      });
      toast.success('Station diperbarui');
      onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          editForm.setError(field as keyof EditStationFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  const form = isCreate ? createForm : editForm;
  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog
      open
      onClose={onClose}
      title={isCreate ? 'Tambah Station' : 'Edit Station'}
      description={!isCreate && station ? station.id : undefined}
      data-testid="dialog-station"
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={
          isCreate
            ? createForm.handleSubmit(onCreate)
            : editForm.handleSubmit(onEdit)
        }
      >
        {isCreate ? (
          <Field
            label="ID"
            htmlFor="station-id"
            required
            error={errors.id?.message}
          >
            <Input
              id="station-id"
              data-testid="input-station-id"
              maxLength={64}
              placeholder="st-03"
              {...createForm.register('id')}
            />
          </Field>
        ) : null}

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
            {...(isCreate
              ? createForm.register('name')
              : editForm.register('name'))}
          />
        </Field>

        <Field
          label="IP Address"
          htmlFor="station-ip"
          error={errors.ipAddress?.message}
        >
          <Input
            id="station-ip"
            data-testid="input-station-ip"
            maxLength={64}
            placeholder="192.168.10.5"
            {...(isCreate
              ? createForm.register('ipAddress')
              : editForm.register('ipAddress'))}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field
            label="MQTT Host"
            htmlFor="station-mqtt-host"
            error={errors.mqttBrokerHost?.message}
            className="col-span-2"
          >
            <Input
              id="station-mqtt-host"
              data-testid="input-station-mqtt-host"
              maxLength={255}
              placeholder="192.168.10.1"
              {...(isCreate
                ? createForm.register('mqttBrokerHost')
                : editForm.register('mqttBrokerHost'))}
            />
          </Field>
          <Field
            label="Port"
            htmlFor="station-mqtt-port"
            error={errors.mqttBrokerPort?.message}
          >
            <Input
              id="station-mqtt-port"
              data-testid="input-station-mqtt-port"
              type="number"
              inputMode="numeric"
              min={1}
              max={65535}
              className="font-mono tabular-nums"
              placeholder="1883"
              {...(isCreate
                ? createForm.register('mqttBrokerPort')
                : editForm.register('mqttBrokerPort'))}
            />
          </Field>
        </div>

        <Field label="Firmware" htmlFor="station-firmware">
          <Input
            id="station-firmware"
            data-testid="input-station-firmware"
            maxLength={64}
            {...(isCreate
              ? createForm.register('firmware')
              : editForm.register('firmware'))}
          />
        </Field>

        <Field label="Catatan" htmlFor="station-notes">
          <Textarea
            id="station-notes"
            data-testid="input-station-notes"
            rows={2}
            maxLength={1024}
            {...(isCreate
              ? createForm.register('notes')
              : editForm.register('notes'))}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-save-station"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function NodeFormDialog({
  dialog,
  stations,
  onClose,
  onSaved,
}: {
  dialog: NonNullable<NodeDialog>;
  stations: Station[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = dialog.mode === 'create';
  const node = dialog.mode === 'edit' ? dialog.node : null;
  const activeStations = stations.filter((s) => s.isActive);

  const createForm = useForm<CreateNodeFormValues, unknown, CreateNodeForm>({
    resolver: zodResolver(createNodeSchema),
    defaultValues: {
      id: '',
      stationId: activeStations[0]?.id ?? '',
      name: '',
      firmware: '',
    },
  });

  const editForm = useForm<EditNodeFormValues, unknown, EditNodeForm>({
    resolver: zodResolver(editNodeSchema),
    defaultValues: {
      stationId: node?.stationId ?? '',
      name: node?.name ?? '',
      firmware: node?.firmware ?? '',
    },
  });

  useEffect(() => {
    if (dialog.mode === 'edit') {
      editForm.reset({
        stationId: dialog.node.stationId,
        name: dialog.node.name,
        firmware: dialog.node.firmware ?? '',
      });
    }
  }, [dialog, editForm]);

  async function onCreate(values: CreateNodeForm) {
    try {
      await api.createNode({
        id: values.id.trim(),
        stationId: values.stationId,
        name: values.name.trim(),
        firmware: values.firmware ?? null,
      });
      toast.success('Node dibuat');
      onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          createForm.setError(field as keyof CreateNodeFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  async function onEdit(values: EditNodeForm) {
    if (!node) return;
    try {
      await api.patchNode(node.id, {
        stationId: values.stationId,
        name: values.name.trim(),
        firmware: values.firmware ?? null,
      });
      toast.success('Node diperbarui');
      onSaved();
      onClose();
    } catch (err) {
      const fe = getValidationErrors(err);
      if (fe) {
        for (const [field, message] of Object.entries(fe)) {
          editForm.setError(field as keyof EditNodeFormValues, {
            type: 'server',
            message,
          });
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  const errors = (isCreate ? createForm : editForm).formState.errors as Record<
    string,
    { message?: string } | undefined
  >;
  const isSubmitting = (isCreate ? createForm : editForm).formState
    .isSubmitting;

  const stationOptions =
    isCreate || !node
      ? activeStations
      : (() => {
          const list = [...activeStations];
          if (!list.some((s) => s.id === node.stationId)) {
            const found = stations.find((s) => s.id === node.stationId);
            if (found) list.unshift(found);
            else
              list.unshift({
                id: node.stationId,
                name: node.stationId,
                status: 'OFFLINE',
                lastSeen: null,
                firmware: null,
                ipAddress: null,
                mqttBrokerHost: null,
                mqttBrokerPort: null,
                notes: null,
                isActive: false,
                createdAt: '',
                updatedAt: '',
              });
          }
          return list;
        })();

  return (
    <Dialog
      open
      onClose={onClose}
      title={isCreate ? 'Tambah Node' : 'Edit Node'}
      description={!isCreate && node ? node.id : undefined}
      data-testid="dialog-node"
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={
          isCreate
            ? createForm.handleSubmit(onCreate)
            : editForm.handleSubmit(onEdit)
        }
      >
        {isCreate ? (
          <Field
            label="ID"
            htmlFor="node-id"
            required
            error={errors.id?.message}
          >
            <Input
              id="node-id"
              data-testid="input-node-id"
              maxLength={64}
              placeholder="node-01"
              {...createForm.register('id')}
            />
          </Field>
        ) : null}

        <Field
          label="Station"
          htmlFor="node-station"
          required
          error={errors.stationId?.message}
          hint={
            stationOptions.length === 0
              ? 'Belum ada station aktif. Buat station dulu.'
              : undefined
          }
        >
          <Select
            id="node-station"
            data-testid="select-node-station"
            {...(isCreate
              ? createForm.register('stationId')
              : editForm.register('stationId'))}
          >
            <option value="">Pilih station…</option>
            {stationOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Nama"
          htmlFor="node-name"
          required
          error={errors.name?.message}
        >
          <Input
            id="node-name"
            data-testid="input-node-name"
            maxLength={128}
            {...(isCreate
              ? createForm.register('name')
              : editForm.register('name'))}
          />
        </Field>

        <Field label="Firmware" htmlFor="node-firmware">
          <Input
            id="node-firmware"
            data-testid="input-node-firmware"
            maxLength={64}
            {...(isCreate
              ? createForm.register('firmware')
              : editForm.register('firmware'))}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-save-node"
            disabled={isSubmitting || (isCreate && stationOptions.length === 0)}
          >
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
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
  const [stationDialog, setStationDialog] = useState<StationDialog>(null);
  const [nodeDialog, setNodeDialog] = useState<NodeDialog>(null);
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

  // Active stations for node create dropdown (always load active list)
  const { data: activeStations } = useStations();

  async function invalidateDevices() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.stations.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis }),
    ]);
  }

  async function handleDeleteStation(s: Station) {
    if (
      !window.confirm(
        `Nonaktifkan station "${s.name}" (${s.id})? Soft-delete.`
      )
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

  async function handleDeleteNode(n: Node) {
    if (
      !window.confirm(`Nonaktifkan node "${n.name}" (${n.id})? Soft-delete.`)
    ) {
      return;
    }
    try {
      await api.deleteNode(n.id);
      toast.success('Node dinonaktifkan');
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
    <div data-testid="page-perangkat" className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Perangkat
          </h1>
          <p className="text-muted mt-1 text-base">
            Station &amp; node lapangan · live status
          </p>
        </div>
        <label className="text-muted flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            data-testid="toggle-include-inactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="accent-accent size-4"
          />
          Tampilkan nonaktif
        </label>
      </header>

      <div className="border-border bg-card flex flex-wrap items-center gap-2 border p-4">
        <button
          type="button"
          data-testid="tab-station"
          data-active={tab === 'station' ? 'true' : 'false'}
          onClick={() => setTab('station')}
          className={cn(
            'border-border text-muted hover:bg-control-hover hover:text-foreground inline-flex min-h-11 items-center border px-4 text-sm font-semibold transition-colors',
            tab === 'station' &&
              'border-accent bg-surface-muted text-accent'
          )}
        >
          Station
          <span className="ml-2 font-mono tabular-nums opacity-80">
            {stationRows.length}
          </span>
        </button>
        <button
          type="button"
          data-testid="tab-node"
          data-active={tab === 'node' ? 'true' : 'false'}
          onClick={() => setTab('node')}
          className={cn(
            'border-border text-muted hover:bg-control-hover hover:text-foreground inline-flex min-h-11 items-center border px-4 text-sm font-semibold transition-colors',
            tab === 'node' && 'border-accent bg-surface-muted text-accent'
          )}
        >
          Node
          <span className="ml-2 font-mono tabular-nums opacity-80">
            {nodeRows.length}
          </span>
        </button>
      </div>

      {tab === 'station' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted text-sm">
              Gateway MQTT · IP &amp; broker config
            </p>
            <button
              type="button"
              data-testid="btn-create-station"
              onClick={() => setStationDialog({ mode: 'create' })}
              className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold transition-colors"
            >
              + Station
            </button>
          </div>

          {stationsLoading && !stations ? (
            <div className="border-border bg-card h-40 animate-pulse border" />
          ) : stationsError && !stations ? (
            <EmptyState
              title="Gagal memuat station"
              description="Periksa koneksi backend."
            />
          ) : stationRows.length === 0 ? (
            <EmptyState
              title="Belum ada station"
              description="Tambah station untuk mendaftarkan node lapangan."
              action={
                <button
                  type="button"
                  onClick={() => setStationDialog({ mode: 'create' })}
                  className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold"
                >
                  Buat station
                </button>
              }
            />
          ) : (
            <div className="border-border overflow-x-auto border">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="border-border text-muted border-b text-sm font-semibold">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Nama</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">IP</th>
                    <th className="px-3 py-3">MQTT</th>
                    <th className="px-3 py-3">Firmware</th>
                    <th className="px-3 py-3">Last Seen</th>
                    <th className="px-3 py-3">Nodes</th>
                    <th className="px-3 py-3">Aktif</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {stationRows.map((s) => (
                    <tr
                      key={s.id}
                      data-testid={`station-row-${s.id}`}
                      className={cn(
                        'border-border hover:bg-control-hover border-b',
                        !s.isActive && 'opacity-50'
                      )}
                    >
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {s.id}
                      </td>
                      <td className="max-w-40 truncate px-3 py-3 text-sm">
                        {s.name}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {s.ipAddress ?? '-'}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {mqttLabel(s)}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm">
                        {s.firmware ?? '-'}
                      </td>
                      <td className="text-muted px-3 py-3 font-mono text-sm tabular-nums">
                        {formatRelativeWib(s.lastSeen, now)}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {s.nodeCount ?? 0}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {s.isActive ? (
                          <span className="text-triage-green">Ya</span>
                        ) : (
                          <span className="text-muted">Tidak</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            data-testid={`btn-edit-station-${s.id}`}
                            onClick={() =>
                              setStationDialog({ mode: 'edit', station: s })
                            }
                            className="border-border bg-background text-foreground hover:border-accent hover:bg-control-hover min-h-11 border px-3 text-sm"
                          >
                            Edit
                          </button>
                          {s.isActive ? (
                            <button
                              type="button"
                              data-testid={`btn-delete-station-${s.id}`}
                              onClick={() => handleDeleteStation(s)}
                              className="border-border text-muted hover:border-triage-red hover:bg-control-hover hover:text-triage-red min-h-11 border px-3 text-sm"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <p className="text-muted text-sm">Node LoRa · RSSI / SNR / bat</p>
              <select
                data-testid="filter-node-station"
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="border-border bg-background text-foreground min-h-11 min-w-36 border px-3 text-sm outline-none"
              >
                <option value="">Semua station</option>
                {(stations ?? activeStations ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              data-testid="btn-create-node"
              onClick={() => setNodeDialog({ mode: 'create' })}
              className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold transition-colors"
            >
              + Node
            </button>
          </div>

          {nodesLoading && !nodes ? (
            <div className="border-border bg-card h-40 animate-pulse border" />
          ) : nodesError && !nodes ? (
            <EmptyState
              title="Gagal memuat node"
              description="Periksa koneksi backend."
            />
          ) : nodeRows.length === 0 ? (
            <EmptyState
              title="Belum ada node"
              description="Daftarkan node di bawah station yang sudah ada."
              action={
                <button
                  type="button"
                  onClick={() => setNodeDialog({ mode: 'create' })}
                  className="bg-accent text-accent-foreground hover:opacity-90 inline-flex min-h-11 items-center px-4 text-sm font-semibold"
                >
                  Buat node
                </button>
              }
            />
          ) : (
            <div className="border-border overflow-x-auto border">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="border-border text-muted border-b text-sm font-semibold">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Station</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">RSSI</th>
                    <th className="px-3 py-3">SNR</th>
                    <th className="px-3 py-3">Battery</th>
                    <th className="px-3 py-3">Firmware</th>
                    <th className="px-3 py-3">Packets</th>
                    <th className="px-3 py-3">Last Seen</th>
                    <th className="px-3 py-3">Victim</th>
                    <th className="px-3 py-3">Aktif</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {nodeRows.map((n) => (
                    <tr
                      key={n.id}
                      data-testid={`node-row-${n.id}`}
                      className={cn(
                        'border-border hover:bg-control-hover border-b',
                        !n.isActive && 'opacity-50'
                      )}
                    >
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        <div className="flex flex-col">
                          <span>{n.id}</span>
                          <span className="text-muted truncate text-sm">
                            {n.name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-32 truncate px-3 py-3 text-sm">
                        {n.station?.name ??
                          stationNameById.get(n.stationId) ??
                          n.stationId}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={n.status} />
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {n.rssi == null ? '-' : n.rssi}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {n.snr == null ? '-' : n.snr}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {n.battery == null ? '-' : `${n.battery}%`}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm">
                        {n.firmware ?? '-'}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm tabular-nums">
                        {n.packetCount ?? 0}
                      </td>
                      <td className="text-muted px-3 py-3 font-mono text-sm tabular-nums">
                        {formatRelativeWib(n.lastSeen, now)}
                      </td>
                      <td className="max-w-28 truncate px-3 py-3 font-mono text-sm tabular-nums">
                        {n.currentVictimId ??
                          n.currentVictim?.id ??
                          n.currentVictim?.rfid ??
                          '-'}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {n.isActive ? (
                          <span className="text-triage-green">Ya</span>
                        ) : (
                          <span className="text-muted">Tidak</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            data-testid={`btn-edit-node-${n.id}`}
                            onClick={() =>
                              setNodeDialog({ mode: 'edit', node: n })
                            }
                            className="border-border bg-background text-foreground hover:border-accent hover:bg-control-hover min-h-11 border px-3 text-sm"
                          >
                            Edit
                          </button>
                          {n.isActive ? (
                            <button
                              type="button"
                              data-testid={`btn-delete-node-${n.id}`}
                              onClick={() => handleDeleteNode(n)}
                              className="border-border text-muted hover:border-triage-red hover:bg-control-hover hover:text-triage-red min-h-11 border px-3 text-sm"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {stationDialog ? (
        <StationFormDialog
          dialog={stationDialog}
          onClose={() => setStationDialog(null)}
          onSaved={invalidateDevices}
        />
      ) : null}

      {nodeDialog ? (
        <NodeFormDialog
          dialog={nodeDialog}
          stations={[
            ...(activeStations ?? []),
            ...(stations ?? []).filter(
              (s) => !(activeStations ?? []).some((a) => a.id === s.id)
            ),
          ]}
          onClose={() => setNodeDialog(null)}
          onSaved={invalidateDevices}
        />
      ) : null}
    </div>
  );
}

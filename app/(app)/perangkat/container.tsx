'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { EmptyState, formatRelativeWib } from '@/components/triage';
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
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        online
          ? 'border-triage-green/40 bg-triage-green/15 text-triage-green'
          : 'border-border bg-card text-muted'
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          online ? 'bg-triage-green' : 'bg-muted'
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

function fieldClass(err?: boolean) {
  return cn(
    'border-border bg-background text-foreground placeholder:text-muted focus:border-accent h-9 w-full rounded-sm border px-2.5 text-sm outline-none',
    err && 'border-triage-red'
  );
}

function labelClass() {
  return 'text-muted mb-1 block text-[11px] font-medium tracking-wide uppercase';
}

function mqttLabel(s: Station): string {
  const host = s.mqttBrokerHost?.trim();
  if (!host) return '—';
  const port = s.mqttBrokerPort != null ? String(s.mqttBrokerPort) : '—';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="dialog-station"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {isCreate ? 'Tambah Station' : 'Edit Station'}
            </h2>
            {!isCreate && station ? (
              <p className="text-muted mt-0.5 font-mono text-[11px] tabular-nums">
                {station.id}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-xs"
          >
            Tutup
          </button>
        </div>

        <form
          noValidate
          className="space-y-2.5"
          onSubmit={
            isCreate
              ? createForm.handleSubmit(onCreate)
              : editForm.handleSubmit(onEdit)
          }
        >
          {isCreate ? (
            <div>
              <label htmlFor="station-id" className={labelClass()}>
                ID <span className="text-triage-red">*</span>
              </label>
              <input
                id="station-id"
                data-testid="input-station-id"
                className={fieldClass(!!errors.id)}
                maxLength={64}
                placeholder="st-03"
                {...createForm.register('id')}
              />
              {errors.id?.message ? (
                <p className="text-triage-red mt-1 text-[11px]">
                  {errors.id.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="station-name" className={labelClass()}>
              Nama <span className="text-triage-red">*</span>
            </label>
            <input
              id="station-name"
              data-testid="input-station-name"
              className={fieldClass(!!errors.name)}
              maxLength={128}
              {...(isCreate
                ? createForm.register('name')
                : editForm.register('name'))}
            />
            {errors.name?.message ? (
              <p className="text-triage-red mt-1 text-[11px]">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="station-ip" className={labelClass()}>
              IP Address
            </label>
            <input
              id="station-ip"
              data-testid="input-station-ip"
              className={fieldClass(!!errors.ipAddress)}
              maxLength={64}
              placeholder="192.168.10.5"
              {...(isCreate
                ? createForm.register('ipAddress')
                : editForm.register('ipAddress'))}
            />
            {errors.ipAddress?.message ? (
              <p className="text-triage-red mt-1 text-[11px]">
                {errors.ipAddress.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label htmlFor="station-mqtt-host" className={labelClass()}>
                MQTT Host
              </label>
              <input
                id="station-mqtt-host"
                data-testid="input-station-mqtt-host"
                className={fieldClass(!!errors.mqttBrokerHost)}
                maxLength={255}
                placeholder="192.168.10.1"
                {...(isCreate
                  ? createForm.register('mqttBrokerHost')
                  : editForm.register('mqttBrokerHost'))}
              />
              {errors.mqttBrokerHost?.message ? (
                <p className="text-triage-red mt-1 text-[11px]">
                  {errors.mqttBrokerHost.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="station-mqtt-port" className={labelClass()}>
                Port
              </label>
              <input
                id="station-mqtt-port"
                data-testid="input-station-mqtt-port"
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                className={cn(fieldClass(!!errors.mqttBrokerPort), 'font-mono')}
                placeholder="1883"
                {...(isCreate
                  ? createForm.register('mqttBrokerPort')
                  : editForm.register('mqttBrokerPort'))}
              />
              {errors.mqttBrokerPort?.message ? (
                <p className="text-triage-red mt-1 text-[11px]">
                  {errors.mqttBrokerPort.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="station-firmware" className={labelClass()}>
              Firmware
            </label>
            <input
              id="station-firmware"
              data-testid="input-station-firmware"
              className={fieldClass(!!errors.firmware)}
              maxLength={64}
              {...(isCreate
                ? createForm.register('firmware')
                : editForm.register('firmware'))}
            />
          </div>

          <div>
            <label htmlFor="station-notes" className={labelClass()}>
              Catatan
            </label>
            <textarea
              id="station-notes"
              data-testid="input-station-notes"
              rows={2}
              maxLength={1024}
              className={cn(
                fieldClass(!!errors.notes),
                'h-auto resize-y py-2'
              )}
              {...(isCreate
                ? createForm.register('notes')
                : editForm.register('notes'))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border bg-background text-foreground rounded-sm border px-3 py-1.5 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="btn-save-station"
              disabled={isSubmitting}
              className="bg-accent text-background hover:bg-accent/90 disabled:bg-muted h-9 rounded-sm px-4 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="dialog-node"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {isCreate ? 'Tambah Node' : 'Edit Node'}
            </h2>
            {!isCreate && node ? (
              <p className="text-muted mt-0.5 font-mono text-[11px] tabular-nums">
                {node.id}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-xs"
          >
            Tutup
          </button>
        </div>

        <form
          noValidate
          className="space-y-2.5"
          onSubmit={
            isCreate
              ? createForm.handleSubmit(onCreate)
              : editForm.handleSubmit(onEdit)
          }
        >
          {isCreate ? (
            <div>
              <label htmlFor="node-id" className={labelClass()}>
                ID <span className="text-triage-red">*</span>
              </label>
              <input
                id="node-id"
                data-testid="input-node-id"
                className={fieldClass(!!errors.id)}
                maxLength={64}
                placeholder="node-01"
                {...createForm.register('id')}
              />
              {errors.id?.message ? (
                <p className="text-triage-red mt-1 text-[11px]">
                  {errors.id.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="node-station" className={labelClass()}>
              Station <span className="text-triage-red">*</span>
            </label>
            <select
              id="node-station"
              data-testid="select-node-station"
              className={fieldClass(!!errors.stationId)}
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
            </select>
            {errors.stationId?.message ? (
              <p className="text-triage-red mt-1 text-[11px]">
                {errors.stationId.message}
              </p>
            ) : null}
            {stationOptions.length === 0 ? (
              <p className="text-triage-yellow mt-1 text-[11px]">
                Belum ada station aktif. Buat station dulu.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="node-name" className={labelClass()}>
              Nama <span className="text-triage-red">*</span>
            </label>
            <input
              id="node-name"
              data-testid="input-node-name"
              className={fieldClass(!!errors.name)}
              maxLength={128}
              {...(isCreate
                ? createForm.register('name')
                : editForm.register('name'))}
            />
            {errors.name?.message ? (
              <p className="text-triage-red mt-1 text-[11px]">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="node-firmware" className={labelClass()}>
              Firmware
            </label>
            <input
              id="node-firmware"
              data-testid="input-node-firmware"
              className={fieldClass(!!errors.firmware)}
              maxLength={64}
              {...(isCreate
                ? createForm.register('firmware')
                : editForm.register('firmware'))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border bg-background text-foreground rounded-sm border px-3 py-1.5 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="btn-save-node"
              disabled={isSubmitting || (isCreate && stationOptions.length === 0)}
              className="bg-accent text-background hover:bg-accent/90 disabled:bg-muted h-9 rounded-sm px-4 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div data-testid="page-perangkat" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Perangkat
          </h1>
          <p className="text-muted mt-1 text-sm">
            Station &amp; node lapangan · live status
          </p>
        </div>
        <label className="text-muted flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            data-testid="toggle-include-inactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="accent-accent size-3.5"
          />
          Tampilkan nonaktif
        </label>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          data-testid="tab-station"
          data-active={tab === 'station' ? 'true' : 'false'}
          onClick={() => setTab('station')}
          className={cn(
            'border-border text-muted rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
            tab === 'station' &&
              'border-accent/40 bg-accent/10 text-accent'
          )}
        >
          Station
          <span className="ml-1.5 font-mono tabular-nums opacity-80">
            {stationRows.length}
          </span>
        </button>
        <button
          type="button"
          data-testid="tab-node"
          data-active={tab === 'node' ? 'true' : 'false'}
          onClick={() => setTab('node')}
          className={cn(
            'border-border text-muted rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
            tab === 'node' && 'border-accent/40 bg-accent/10 text-accent'
          )}
        >
          Node
          <span className="ml-1.5 font-mono tabular-nums opacity-80">
            {nodeRows.length}
          </span>
        </button>
      </div>

      {tab === 'station' ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted text-xs">
              Gateway MQTT · IP &amp; broker config
            </p>
            <button
              type="button"
              data-testid="btn-create-station"
              onClick={() => setStationDialog({ mode: 'create' })}
              className="bg-accent text-background hover:bg-accent/90 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              + Station
            </button>
          </div>

          {stationsLoading && !stations ? (
            <div className="border-border bg-card h-40 animate-pulse rounded-md border" />
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
                  className="bg-accent text-background rounded-sm px-3 py-1.5 text-xs font-semibold"
                >
                  Buat station
                </button>
              }
            />
          ) : (
            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="border-border text-muted border-b text-[10px] font-semibold tracking-wider uppercase">
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Nama</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">IP</th>
                    <th className="px-2 py-2">MQTT</th>
                    <th className="px-2 py-2">Firmware</th>
                    <th className="px-2 py-2">Last Seen</th>
                    <th className="px-2 py-2">Nodes</th>
                    <th className="px-2 py-2">Aktif</th>
                    <th className="px-2 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {stationRows.map((s) => (
                    <tr
                      key={s.id}
                      data-testid={`station-row-${s.id}`}
                      className={cn(
                        'border-border border-b',
                        !s.isActive && 'opacity-50'
                      )}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {s.id}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-1.5 text-xs">
                        {s.name}
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {s.ipAddress ?? '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {mqttLabel(s)}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        {s.firmware ?? '—'}
                      </td>
                      <td className="text-muted px-2 py-1.5 font-mono text-[11px] tabular-nums">
                        {formatRelativeWib(s.lastSeen, now)}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {s.nodeCount ?? 0}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {s.isActive ? (
                          <span className="text-triage-green">Ya</span>
                        ) : (
                          <span className="text-muted">Tidak</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            data-testid={`btn-edit-station-${s.id}`}
                            onClick={() =>
                              setStationDialog({ mode: 'edit', station: s })
                            }
                            className="border-border bg-background text-foreground hover:border-accent rounded-sm border px-2 py-0.5 text-[11px]"
                          >
                            Edit
                          </button>
                          {s.isActive ? (
                            <button
                              type="button"
                              data-testid={`btn-delete-station-${s.id}`}
                              onClick={() => handleDeleteStation(s)}
                              className="border-border text-muted hover:border-triage-red hover:text-triage-red rounded-sm border px-2 py-0.5 text-[11px]"
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
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted text-xs">Node LoRa · RSSI / SNR / bat</p>
              <select
                data-testid="filter-node-station"
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="border-border bg-background text-foreground h-8 min-w-[140px] rounded-sm border px-2 text-xs outline-none"
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
              className="bg-accent text-background hover:bg-accent/90 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              + Node
            </button>
          </div>

          {nodesLoading && !nodes ? (
            <div className="border-border bg-card h-40 animate-pulse rounded-md border" />
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
                  className="bg-accent text-background rounded-sm px-3 py-1.5 text-xs font-semibold"
                >
                  Buat node
                </button>
              }
            />
          ) : (
            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="border-border text-muted border-b text-[10px] font-semibold tracking-wider uppercase">
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Station</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">RSSI</th>
                    <th className="px-2 py-2">SNR</th>
                    <th className="px-2 py-2">Battery</th>
                    <th className="px-2 py-2">Firmware</th>
                    <th className="px-2 py-2">Packets</th>
                    <th className="px-2 py-2">Last Seen</th>
                    <th className="px-2 py-2">Victim</th>
                    <th className="px-2 py-2">Aktif</th>
                    <th className="px-2 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {nodeRows.map((n) => (
                    <tr
                      key={n.id}
                      data-testid={`node-row-${n.id}`}
                      className={cn(
                        'border-border border-b',
                        !n.isActive && 'opacity-50'
                      )}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        <div className="flex flex-col">
                          <span>{n.id}</span>
                          <span className="text-muted truncate text-[10px]">
                            {n.name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-1.5 text-xs">
                        {n.station?.name ??
                          stationNameById.get(n.stationId) ??
                          n.stationId}
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusPill status={n.status} />
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {n.rssi == null ? '—' : n.rssi}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {n.snr == null ? '—' : n.snr}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {n.battery == null ? '—' : `${n.battery}%`}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        {n.firmware ?? '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs tabular-nums">
                        {n.packetCount ?? 0}
                      </td>
                      <td className="text-muted px-2 py-1.5 font-mono text-[11px] tabular-nums">
                        {formatRelativeWib(n.lastSeen, now)}
                      </td>
                      <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-xs tabular-nums">
                        {n.currentVictimId ??
                          n.currentVictim?.id ??
                          n.currentVictim?.rfid ??
                          '—'}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {n.isActive ? (
                          <span className="text-triage-green">Ya</span>
                        ) : (
                          <span className="text-muted">Tidak</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            data-testid={`btn-edit-node-${n.id}`}
                            onClick={() =>
                              setNodeDialog({ mode: 'edit', node: n })
                            }
                            className="border-border bg-background text-foreground hover:border-accent rounded-sm border px-2 py-0.5 text-[11px]"
                          >
                            Edit
                          </button>
                          {n.isActive ? (
                            <button
                              type="button"
                              data-testid={`btn-delete-node-${n.id}`}
                              onClick={() => handleDeleteNode(n)}
                              className="border-border text-muted hover:border-triage-red hover:text-triage-red rounded-sm border px-2 py-0.5 text-[11px]"
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

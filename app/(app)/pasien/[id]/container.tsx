'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';

import {
  ageLabel,
  EmptyState,
  EsiChip,
  PriorityBadge,
  StaleIndicator,
  VitalCell,
  asPriority,
  formatBp,
  formatConfidence,
  formatRelativeWib,
  formatTimeWib,
  genderLabel,
  isStale,
  rrBandLabel,
} from '@/components/triage';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { queryKeys, useVictim } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage, getValidationErrors } from '@/lib/http-error';
import {
  registrasiSchema,
  type RegistrasiForm,
  type RegistrasiFormValues,
} from '@/schemas/victim';
import type { Priority, TriageHistory, VictimStatus } from '@/types';

function formDefaults(v: {
  name?: string | null;
  age?: number | null;
  gender?: 'M' | 'F' | 'U' | null;
  notes?: string | null;
  nik?: string | null;
  address?: string | null;
  familyContactName?: string | null;
  familyContactPhone?: string | null;
  chiefComplaint?: string | null;
}): RegistrasiFormValues {
  return {
    name: v.name ?? '',
    age: v.age ?? null,
    gender: v.gender ?? null,
    notes: v.notes ?? '',
    nik: v.nik ?? '',
    address: v.address ?? '',
    familyContactName: v.familyContactName ?? '',
    familyContactPhone: v.familyContactPhone ?? '',
    chiefComplaint: v.chiefComplaint ?? '',
  };
}

const PRIORITY_LABELS: Record<Priority, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
  BLACK: 'Hitam',
};

const STATUS_LABELS: Record<VictimStatus, string> = {
  ACTIVE: 'Aktif',
  REFERRED: 'Dirujuk',
  DISCHARGED: 'Pulang',
  DECEASED: 'Meninggal',
};

/** A band label like "6–17" contains no "th"; a real number does. */
const AGE_IS_BAND = /[–-]/;

/**
 * Confirmation + mandatory reason for an operator override. BLACK only ever
 * comes from a human — the model never sends it — so this dialog is the gate.
 */
function OverrideDialog({
  priority,
  onClose,
  onConfirm,
}: {
  priority: Priority | null;
  onClose: () => void;
  onConfirm: (priority: Priority, reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open={priority !== null}
      onClose={onClose}
      title="Keputusan petugas"
      description="Override tidak ditimpa otomatis oleh pembacaan alat berikutnya."
      data-testid="dialog-override"
    >
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (priority && reason.trim()) onConfirm(priority, reason.trim());
        }}
      >
        <p className="text-[0.8125rem]">
          <span className="text-muted">Ubah kategori ke </span>
          <span className="text-foreground font-semibold">
            {priority ? PRIORITY_LABELS[priority] : ''}
          </span>
        </p>
        <Field label="Alasan (wajib)" htmlFor="override-reason">
          <Textarea
            id="override-reason"
            data-testid="input-override-reason"
            rows={3}
            maxLength={512}
            placeholder="Alasan keputusan petugas"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-confirm-override"
            disabled={!reason.trim()}
          >
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/** Referral destination. DISCHARGED/DECEASED confirm in the click handler. */
function StatusDialog({
  status,
  onClose,
  onConfirm,
}: {
  status: VictimStatus | null;
  onClose: () => void;
  onConfirm: (status: VictimStatus, destination: string) => void;
}) {
  const [destination, setDestination] = useState('');
  if (status !== 'REFERRED') return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Rujuk pasien"
      data-testid="dialog-refer"
    >
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (destination.trim()) onConfirm('REFERRED', destination.trim());
        }}
      >
        <Field
          label="Tujuan rujukan"
          htmlFor="referral-destination"
          hint="Pasien keluar dari daftar aktif setelah dirujuk."
        >
          <Input
            id="referral-destination"
            data-testid="input-referral-destination"
            maxLength={256}
            placeholder="RS rujukan / faskes tujuan"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            data-testid="btn-confirm-refer"
            disabled={!destination.trim()}
          >
            Rujuk
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function PasienDetailContainer() {
  const [overrideTarget, setOverrideTarget] = useState<Priority | null>(null);
  const [statusTarget, setStatusTarget] = useState<VictimStatus | null>(null);
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const queryClient = useQueryClient();

  const { data: victim, isLoading, isError, error } = useVictim(id);

  const { data: vitalsHistory } = useQuery({
    queryKey: queryKeys.victims.vitals(id),
    queryFn: () => api.getVictimVitals(id, 20),
    enabled: Boolean(id),
  });

  const { data: triageHistory, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.victims.triageHistory(id),
    queryFn: () => api.getVictimTriageHistory(id),
    enabled: Boolean(id),
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrasiFormValues, unknown, RegistrasiForm>({
    resolver: zodResolver(registrasiSchema),
    defaultValues: formDefaults({}),
  });

  useEffect(() => {
    if (!victim) return;
    reset(formDefaults(victim));
  }, [victim, reset]);

  async function onSubmit(values: RegistrasiForm) {
    if (!id) return;
    try {
      const updated = await api.patchVictim(id, {
        name: values.name.trim(),
        age: values.age ?? null,
        gender: values.gender ?? null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        nik: values.nik ?? null,
        address: values.address ?? null,
        familyContactName: values.familyContactName ?? null,
        familyContactPhone: values.familyContactPhone ?? null,
        chiefComplaint: values.chiefComplaint ?? null,
      });
      queryClient.setQueryData(queryKeys.victims.detail(id), updated);
      queryClient.setQueriesData(
        { queryKey: [...queryKeys.victims.all, 'list'] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.map((v: { id: string }) =>
            v.id === id ? { ...v, ...updated } : v
          );
        }
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.victims.all });
      reset(formDefaults(updated));
      toast.success('Registrasi tersimpan');
    } catch (err) {
      const fieldErrors = getValidationErrors(err);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (
            field === 'name' ||
            field === 'age' ||
            field === 'gender' ||
            field === 'notes' ||
            field === 'nik' ||
            field === 'address' ||
            field === 'familyContactName' ||
            field === 'familyContactPhone' ||
            field === 'chiefComplaint'
          ) {
            setError(field as keyof RegistrasiFormValues, {
              type: 'server',
              message,
            });
          }
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  async function onOverride(priority: Priority, reason: string) {
    if (!id) return;
    try {
      const updated = await api.overrideVictim(id, { priority, reason });
      queryClient.setQueryData(queryKeys.victims.detail(id), updated);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.victims.triageHistory(id),
      });
      toast.success('Keputusan petugas tersimpan');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function onStatus(status: VictimStatus, destination: string) {
    if (!id) return;
    try {
      const updated = await api.patchVictim(id, {
        status,
        referralDestination: status === 'REFERRED' ? destination : null,
      });
      queryClient.setQueryData(queryKeys.victims.detail(id), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.victims.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
      toast.success('Status pasien diperbarui');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (!id) {
    return (
      <div data-testid="page-pasien-detail" className="space-y-3.5">
        <EmptyState
          title="ID pasien tidak valid"
          description="Kembali ke daftar pasien."
          action={
            <Link
              href="/pasien"
              className="bg-chip rounded-control text-foreground hover:bg-control-hover inline-flex min-h-11 items-center px-4 text-[0.8125rem] font-semibold transition-colors"
            >
              Daftar pasien
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading && !victim) {
    return (
      <div data-testid="page-pasien-detail" className="space-y-3.5">
        <div className="bg-card rounded-card h-24 animate-pulse" />
        <div className="grid gap-3.5 lg:grid-cols-12">
          <div className="bg-card rounded-card h-64 animate-pulse lg:col-span-7" />
          <div className="bg-card rounded-card h-64 animate-pulse lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (isError && !victim) {
    return (
      <div data-testid="page-pasien-detail" className="space-y-3.5">
        <EmptyState
          title="Pasien tidak ditemukan"
          description={getErrorMessage(error)}
          action={
            <Link
              href="/pasien"
              className="bg-chip rounded-control text-foreground hover:bg-control-hover inline-flex min-h-11 items-center px-4 text-[0.8125rem] font-semibold transition-colors"
            >
              Kembali
            </Link>
          }
        />
      </div>
    );
  }

  if (!victim) return null;

  const stale = isStale(victim.lastUpdate, 45_000, now);
  const needsReg = !victim.name?.trim();
  // The socket patch first, the last stored reading as the fallback: only this
  // page has one, because /api/victims/:id carries no vitals.
  const latestVital = vitalsHistory?.[0];
  const hr = victim.hr ?? latestVital?.hr;
  const spo2 = victim.spo2 ?? latestVital?.spo2;
  const rr = victim.rr ?? latestVital?.rr;
  const bpSys = victim.bpSys ?? latestVital?.bpSys;
  const bpDia = victim.bpDia ?? latestVital?.bpDia;
  const battery = victim.battery ?? latestVital?.battery;
  const esi = victim.esi ?? latestVital?.esi;
  const hrSource = victim.hrSource ?? latestVital?.hrSource;
  const bpMeasuredAt = victim.bpMeasuredAt ?? latestVital?.bpMeasuredAt;

  return (
    <div data-testid="page-pasien-detail" className="space-y-3.5">
      {/* Header strip */}
      <header className="bg-card rounded-card flex flex-wrap items-center gap-5 px-[18px] py-4 sm:px-[22px]">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pasien"
              className="text-muted hover:text-foreground inline-flex min-h-11 items-center text-[0.8125rem] transition-colors"
            >
              <ArrowLeftIcon className="mr-2 size-4" aria-hidden />
              Pasien
            </Link>
            {needsReg ? (
              <span
                data-testid="badge-perlu-registrasi"
                className="text-triage-yellow bg-triage-yellow/12 rounded-md px-2.5 py-[3px] text-[0.6875rem] font-semibold"
              >
                Perlu registrasi
              </span>
            ) : null}
            <span
              className={cn(
                'rounded-md px-2.5 py-[3px] text-[0.6875rem] font-semibold',
                stale
                  ? 'text-muted bg-surface-muted'
                  : 'text-triage-green bg-triage-green/12'
              )}
            >
              {stale ? 'Data lama' : 'Live'}
            </span>
          </div>
          <h1 className="text-foreground mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
            {victim.name?.trim() || 'Belum terdaftar'}
          </h1>
          <p className="text-muted mt-1 font-mono text-xs tabular-nums">
            RFID{' '}
            <span className="text-foreground" title="readonly">
              {victim.rfid}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            {/* Age/gender arrive from the operator's band answer on the device
                (or an operator PATCH); '-' means never asked, not 0/unknown. */}
            {victim.age != null ? (
              <>
                <span
                  className="text-foreground"
                  title={`Nilai terkirim: ${victim.age}`}
                >
                  {ageLabel(victim.age)}
                  {AGE_IS_BAND.test(String(victim.age)) ? '' : ' th'}
                </span>
                <span className="mx-1.5 opacity-40">·</span>
              </>
            ) : null}
            {victim.gender != null ? (
              <>
                <span className="text-foreground">
                  {genderLabel(victim.gender)}
                </span>
                <span className="mx-1.5 opacity-40">·</span>
              </>
            ) : null}
            <span className="tabular-nums">
              {formatRelativeWib(victim.lastUpdate, now)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* ESI rides with the badge it is provenance for: the colour collapses
              ESI 3/4/5 into GREEN, so this chip is what keeps them apart. */}
          <div className="flex min-w-0 flex-col items-start gap-1">
            <PriorityBadge priority={victim.currentPriority} size="md" />
            <EsiChip esi={esi} />
          </div>
          {victim.deviceDiffersFromOperator ? (
            <span
              data-testid="badge-device-differs"
              className="text-triage-yellow bg-triage-yellow/12 rounded-md px-2.5 py-[3px] text-[0.6875rem] font-semibold"
            >
              Kategori alat berbeda dari keputusan petugas
            </span>
          ) : null}
          {victim.currentNodeId ? (
            <Link
              href={`/perangkat?node=${encodeURIComponent(victim.currentNodeId)}`}
              className="bg-chip rounded-control text-muted hover:text-foreground hover:bg-control-hover inline-flex min-h-11 items-center px-3.5 font-mono text-xs tabular-nums transition-colors"
              title="Node aktif"
            >
              {victim.currentNodeId}
            </Link>
          ) : (
            <span className="text-dim text-xs">Node -</span>
          )}
          <StaleIndicator lastUpdate={victim.lastUpdate} />
        </div>
      </header>

      <div className="grid gap-3.5 lg:grid-cols-12">
        {/* Left: vitals + ML */}
        <div className="space-y-3.5 lg:col-span-7">
          <section className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-foreground text-[0.9375rem] font-semibold">
                Vitals live
              </h2>
              <span className="text-dim text-[0.6875rem]">
                {formatRelativeWib(victim.lastUpdate, now)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
              <VitalCell
                label="HR"
                value={hr}
                unit="bpm"
                kind="hr"
                stale={stale}
                data-testid="vital-hr"
              />
              <VitalCell
                label="SpO2 (tren)"
                value={spo2}
                unit="%"
                kind="spo2"
                stale={stale}
                data-testid="vital-spo2"
              />
              {/* No `kind`, so no severity color: the value is the band the
                  operator tapped (the firmware sends its mid-point, mapped back
                  here), not a rate anyone counted. */}
              <VitalCell
                label="RR (operator)"
                value={rrBandLabel(rr)}
                stale={stale}
                data-testid="vital-rr"
              />
              {/* Mirrors VitalCell's lg variant; BP has no single numeric value.
                  "prediksi ML": the model, not a cuff — the only comparison
                  done so far read ~27 mmHg low on both numbers. */}
              <div className="bg-surface-input rounded-control flex min-w-0 flex-col gap-[5px] px-3.5 py-3">
                <span className="text-muted text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
                  BP (prediksi ML)
                </span>
                <span
                  data-testid="vital-bp"
                  className={cn(
                    'font-mono text-[1.375rem] leading-none font-semibold tabular-nums',
                    stale ? 'text-dim' : 'text-foreground'
                  )}
                >
                  {formatBp(bpSys, bpDia)}
                  {bpSys != null && bpDia != null ? (
                    <span className="text-dim ml-[3px] text-[0.6875rem] font-normal">
                      mmHg
                    </span>
                  ) : null}
                </span>
                {/* BP is latched, not live (brief butir 5): its own stamp keeps
                    an old number from reading as a current measurement. */}
                <span
                  data-testid="bp-measured-at"
                  className={cn(
                    'text-[0.6875rem] font-medium tabular-nums',
                    // 5 minutes old reads as stale next to live HR/SpO2.
                    bpMeasuredAt && now - Date.parse(bpMeasuredAt) > 300_000
                      ? 'text-triage-yellow'
                      : 'text-dim'
                  )}
                >
                  {bpMeasuredAt
                    ? `TD diukur ${formatTimeWib(bpMeasuredAt)}`
                    : 'TD belum terukur'}
                </span>
              </div>
              <VitalCell
                label="Battery"
                value={battery}
                unit="%"
                kind="battery"
                stale={stale}
                data-testid="vital-battery"
              />
            </div>
          </section>

          {/* Operator actions (brief butir 7): BLACK comes only from a human. */}
          <section className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]">
            <h2 className="text-foreground mb-3 text-[0.9375rem] font-semibold">
              Keputusan petugas
            </h2>
            {victim.operatorOverride ? (
              <p className="text-muted mb-3 text-[0.8125rem]">
                Override terakhir:{' '}
                <span className="text-foreground font-semibold">
                  {PRIORITY_LABELS[victim.operatorOverride.priority]}
                </span>{' '}
                · {victim.operatorOverride.reason} ·{' '}
                <span className="font-mono text-xs tabular-nums">
                  {formatRelativeWib(victim.operatorOverride.at, now)}
                </span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                data-testid="btn-override-red"
                onClick={() => setOverrideTarget('RED')}
              >
                Ubah ke Merah
              </Button>
              <Button
                variant="secondary"
                size="sm"
                data-testid="btn-override-yellow"
                onClick={() => setOverrideTarget('YELLOW')}
              >
                Ubah ke Kuning
              </Button>
              <Button
                variant="secondary"
                size="sm"
                data-testid="btn-override-green"
                onClick={() => setOverrideTarget('GREEN')}
              >
                Ubah ke Hijau
              </Button>
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-mark-black"
                onClick={() => setOverrideTarget('BLACK')}
                className="text-muted hover:text-triage-red-ink"
              >
                Tandai Hitam
              </Button>
            </div>
          </section>

          {/* Status flow (brief butir 7): non-ACTIVE leaves the active list. */}
          <section className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]">
            <h2 className="text-foreground mb-3 text-[0.9375rem] font-semibold">
              Status pasien
            </h2>
            <p className="text-muted mb-3 text-[0.8125rem]">
              Status:{' '}
              <span className="text-foreground font-semibold">
                {STATUS_LABELS[victim.status ?? 'ACTIVE']}
              </span>
              {victim.status === 'REFERRED' && victim.referralDestination
                ? ` → ${victim.referralDestination}`
                : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                data-testid="btn-refer"
                onClick={() => {
                  if (confirmNonActive('REFERRED')) setStatusTarget('REFERRED');
                }}
              >
                Rujuk
              </Button>
              <Button
                variant="secondary"
                size="sm"
                data-testid="btn-discharge"
                onClick={() => {
                  if (confirmNonActive('DISCHARGED'))
                    void onStatus('DISCHARGED', '');
                }}
              >
                Pulang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-deceased"
                onClick={() => {
                  if (confirmNonActive('DECEASED'))
                    void onStatus('DECEASED', '');
                }}
                className="text-muted hover:text-triage-red-ink"
              >
                Meninggal
              </Button>
            </div>
          </section>

          {/* Technical provenance, closed by default (brief butir 8): the model
              score is not a calibrated clinical certainty, so it must not read
              as one next to the vitals. */}
          <details
            data-testid="technical-info"
            className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]"
          >
            <summary className="text-foreground cursor-pointer text-[0.9375rem] font-semibold">
              Info teknis
            </summary>
            <dl className="text-muted mt-3 space-y-1.5 text-[0.8125rem]">
              <div className="flex justify-between gap-4">
                <dt>Skor model (tidak terkalibrasi)</dt>
                <dd className="text-foreground font-mono tabular-nums">
                  {formatConfidence(victim.confidence)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>ESI mentah</dt>
                <dd className="text-foreground font-mono tabular-nums">
                  {esi == null ? '-' : `ESI ${esi}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Status perangkat</dt>
                <dd
                  className={cn(
                    'font-mono tabular-nums',
                    stale ? 'text-triage-yellow' : 'text-triage-green'
                  )}
                >
                  {stale ? 'Data lama' : 'Live'}
                </dd>
              </div>
              {hrSource ? (
                <div className="flex justify-between gap-4">
                  <dt>Sumber HR</dt>
                  <dd className="text-foreground font-mono tabular-nums">
                    {hrSource === 'ECG' ? 'EKG' : 'PPG'}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>

          <section
            data-testid="vitals-history"
            className="bg-card rounded-card overflow-hidden"
          >
            <h2 className="text-foreground px-[18px] pt-[18px] pb-3 text-[0.9375rem] font-semibold sm:px-[22px]">
              Riwayat vital
            </h2>
            {vitalsHistory?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="bg-surface-header text-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                      <th className="px-[18px] py-2.5 font-semibold sm:px-[22px]">
                        Waktu
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        HR
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        SpO2 (tren)
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        RR (operator)
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        BP (prediksi ML)
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Bat
                      </th>
                      <th className="px-[18px] py-2.5 font-semibold sm:px-[22px]">
                        Prio
                      </th>
                      <th className="px-3 py-2.5 font-semibold">ESI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalsHistory.slice(0, 20).map((r) => {
                      const prio = asPriority(
                        typeof r.priority === 'string' ? r.priority : null
                      );
                      return (
                        <tr
                          key={r.id}
                          className="border-border border-b last:border-0"
                        >
                          <td className="text-muted px-[18px] py-2.5 font-mono text-xs whitespace-nowrap tabular-nums sm:px-[22px]">
                            {formatRelativeWib(r.deviceTs ?? r.receivedAt, now)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <VitalCell
                              label="HR"
                              value={r.hr}
                              kind="hr"
                              variant="inline"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <VitalCell
                              label="SpO2"
                              value={r.spo2}
                              kind="spo2"
                              variant="inline"
                            />
                          </td>
                          {/* Same honesty as the list: the band, not a count. */}
                          <td className="text-muted px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                            {rrBandLabel(r.rr) ?? '-'}
                          </td>
                          <td className="text-muted px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                            {formatBp(r.bpSys, r.bpDia)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <VitalCell
                              label="Bat"
                              value={r.battery}
                              kind="battery"
                              variant="inline"
                            />
                          </td>
                          <td className="px-[18px] py-2.5 sm:px-[22px]">
                            {prio ? (
                              <PriorityBadge priority={prio} />
                            ) : (
                              <span className="text-dim text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <EsiChip esi={r.esi} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-dim px-[18px] pb-[18px] text-[0.8125rem] sm:px-[22px]">
                Belum ada riwayat vital
              </p>
            )}
          </section>
        </div>

        {/* Right: form + history */}
        <div className="space-y-3.5 lg:col-span-5">
          <Card>
            <CardHeader
              title="Registrasi"
              action={
                <span className="text-dim text-[0.6875rem]">
                  Prioritas ML (readonly)
                </span>
              }
            />
            <CardBody>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-3"
                noValidate
              >
                <Field
                  label="Nama"
                  htmlFor="input-name"
                  required
                  error={errors.name?.message}
                >
                  <Input
                    id="input-name"
                    data-testid="input-name"
                    type="text"
                    autoComplete="name"
                    maxLength={128}
                    placeholder="Nama korban"
                    {...register('name')}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Usia"
                    htmlFor="input-age"
                    error={errors.age?.message}
                  >
                    <Input
                      id="input-age"
                      data-testid="input-age"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={150}
                      className="font-mono tabular-nums"
                      placeholder="-"
                      {...register('age')}
                    />
                  </Field>

                  <Field
                    label="Gender"
                    htmlFor="select-gender"
                    error={errors.gender?.message}
                  >
                    <Select
                      id="select-gender"
                      data-testid="select-gender"
                      {...register('gender')}
                    >
                      <option value="">Tidak ada</option>
                      <option value="M">L (Laki-laki)</option>
                      <option value="F">P (Perempuan)</option>
                      <option value="U">U (Tidak diketahui)</option>
                    </Select>
                  </Field>
                </div>

                <Field
                  label="Catatan"
                  htmlFor="input-notes"
                  error={errors.notes?.message}
                >
                  <Textarea
                    id="input-notes"
                    data-testid="input-notes"
                    rows={3}
                    maxLength={1024}
                    placeholder="Catatan medis / lokasi / kontak"
                    {...register('notes')}
                  />
                </Field>

                {/* Identity fields (brief butir 6): filled here by the operator,
                    never over LoRa. NIK never appears in lists — only masked. */}
                <Field
                  label="NIK"
                  htmlFor="input-nik"
                  hint="16 digit angka; hanya tampil di halaman ini."
                  error={errors.nik?.message}
                >
                  <Input
                    id="input-nik"
                    data-testid="input-nik"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    className="font-mono tabular-nums"
                    placeholder="-"
                    {...register('nik')}
                  />
                </Field>

                <Field
                  label="Alamat / asal"
                  htmlFor="input-address"
                  error={errors.address?.message}
                >
                  <Textarea
                    id="input-address"
                    data-testid="input-address"
                    rows={2}
                    maxLength={512}
                    placeholder="Desa/kecamatan asal"
                    {...register('address')}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Nama keluarga"
                    htmlFor="input-family-name"
                    error={errors.familyContactName?.message}
                  >
                    <Input
                      id="input-family-name"
                      data-testid="input-family-name"
                      type="text"
                      maxLength={128}
                      placeholder="-"
                      {...register('familyContactName')}
                    />
                  </Field>
                  <Field
                    label="Telepon keluarga"
                    htmlFor="input-family-phone"
                    error={errors.familyContactPhone?.message}
                  >
                    <Input
                      id="input-family-phone"
                      data-testid="input-family-phone"
                      type="tel"
                      maxLength={32}
                      className="font-mono tabular-nums"
                      placeholder="-"
                      {...register('familyContactPhone')}
                    />
                  </Field>
                </div>

                <Field
                  label="Keluhan utama"
                  htmlFor="input-chief-complaint"
                  error={errors.chiefComplaint?.message}
                >
                  <Textarea
                    id="input-chief-complaint"
                    data-testid="input-chief-complaint"
                    rows={2}
                    maxLength={512}
                    placeholder="Keluhan / cedera utama"
                    {...register('chiefComplaint')}
                  />
                </Field>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="submit"
                    data-testid="btn-save-registrasi"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Menyimpan…' : 'Simpan registrasi'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <section className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]">
            <h2 className="text-foreground mb-3.5 text-[0.9375rem] font-semibold">
              Riwayat triage
            </h2>
            {historyLoading && !triageHistory ? (
              <div className="bg-surface-header h-24 animate-pulse rounded-md" />
            ) : !triageHistory || triageHistory.length === 0 ? (
              <p className="text-dim text-[0.8125rem]">
                Belum ada perubahan prioritas.
              </p>
            ) : (
              <ol className="border-border relative border-l pl-4">
                {triageHistory.map((h: TriageHistory) => {
                  const to = asPriority(h.toPriority);
                  const from = asPriority(h.fromPriority ?? null);
                  return (
                    <li key={h.id} className="relative pb-3.5 last:pb-0">
                      <span
                        className="bg-accent absolute top-1.5 -left-[calc(0.1875rem+1px)] size-1.5 rounded-full"
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Source (brief butir 7): operator decisions carry a
                            reason; device transitions do not. */}
                        <span
                          className={cn(
                            'rounded-md px-2 py-[2px] text-[0.625rem] font-semibold tracking-[0.04em] uppercase',
                            h.source === 'OPERATOR'
                              ? 'bg-accent/12 text-accent'
                              : 'bg-surface-muted text-muted'
                          )}
                        >
                          {h.source === 'OPERATOR' ? 'Petugas' : 'Alat'}
                        </span>
                        {from ? <PriorityBadge priority={from} /> : null}
                        {from ? (
                          <span className="text-dim text-xs">→</span>
                        ) : null}
                        {to ? (
                          <PriorityBadge priority={to} />
                        ) : (
                          <span className="text-foreground text-xs font-semibold">
                            {h.toPriority}
                          </span>
                        )}
                      </div>
                      <p className="text-dim mt-1 font-mono text-[0.6875rem] tabular-nums">
                        {formatRelativeWib(h.createdAt, now)}
                      </p>
                      {h.source === 'OPERATOR' && h.reason ? (
                        <p className="text-muted mt-1 text-xs">{h.reason}</p>
                      ) : null}
                      {h.reasons?.length ? (
                        <p className="text-muted mt-1 line-clamp-2 text-xs">
                          {h.reasons.join(' · ')}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <OverrideDialog
        priority={overrideTarget}
        onClose={() => setOverrideTarget(null)}
        onConfirm={(p, reason) => {
          setOverrideTarget(null);
          void onOverride(p, reason);
        }}
      />
      <StatusDialog
        status={statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={(s, destination) => {
          setStatusTarget(null);
          void onStatus(s, destination);
        }}
      />
    </div>
  );
}

function confirmNonActive(status: VictimStatus): boolean {
  if (status === 'REFERRED') return true;
  return window.confirm(
    `Tandai pasien ${STATUS_LABELS[status]}? Pasien keluar dari daftar aktif.`
  );
}

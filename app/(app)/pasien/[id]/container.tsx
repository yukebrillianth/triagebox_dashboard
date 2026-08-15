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
  ConfidenceBar,
  EmptyState,
  PriorityBadge,
  StaleIndicator,
  VitalCell,
  formatBp,
  formatConfidence,
  formatRelativeWib,
  isStale,
} from '@/components/triage';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
import type { Priority, TriageHistory } from '@/types';

const PRIORITY_SET = new Set<string>(['RED', 'YELLOW', 'GREEN', 'BLACK']);

function asPriority(p: string | null | undefined): Priority | null {
  if (!p || !PRIORITY_SET.has(p)) return null;
  return p as Priority;
}

function formDefaults(v: {
  name?: string | null;
  age?: number | null;
  gender?: 'M' | 'F' | 'U' | null;
  notes?: string | null;
}): RegistrasiFormValues {
  return {
    name: v.name ?? '',
    age: v.age ?? null,
    gender: v.gender ?? null,
    notes: v.notes ?? '',
  };
}

export function PasienDetailContainer() {
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
            field === 'notes'
          ) {
            setError(field, { type: 'server', message });
          }
        }
      }
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
  const latestVital = vitalsHistory?.[0];
  const hr = victim.hr ?? latestVital?.hr;
  const spo2 = victim.spo2 ?? latestVital?.spo2;
  const rr = victim.rr ?? latestVital?.rr;
  const bpSys = victim.bpSys ?? latestVital?.bpSys;
  const bpDia = victim.bpDia ?? latestVital?.bpDia;
  const battery = victim.battery ?? latestVital?.battery;
  const reasons = victim.reasons?.length
    ? victim.reasons
    : (latestVital?.reasons ?? []);

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
            <span className="tabular-nums">
              {formatRelativeWib(victim.lastUpdate, now)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <PriorityBadge priority={victim.currentPriority} size="md" />
          <div className="min-w-24">
            <span className="text-muted block text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
              Confidence
            </span>
            <span className="text-foreground font-mono text-[0.9375rem] tabular-nums">
              {formatConfidence(victim.confidence)}
            </span>
          </div>
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
                label="SpO2"
                value={spo2}
                unit="%"
                kind="spo2"
                stale={stale}
                data-testid="vital-spo2"
              />
              <VitalCell
                label="RR"
                value={rr}
                unit="/m"
                kind="rr"
                stale={stale}
                data-testid="vital-rr"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-muted text-[0.625rem] font-semibold tracking-[0.06em] uppercase">
                  BP
                </span>
                <span
                  data-testid="vital-bp"
                  className={cn(
                    'font-mono text-lg leading-none font-semibold tabular-nums',
                    stale ? 'text-dim' : 'text-foreground'
                  )}
                >
                  {formatBp(bpSys, bpDia)}
                  {bpSys != null && bpDia != null ? (
                    <span className="text-dim ml-1 text-xs font-normal">
                      mmHg
                    </span>
                  ) : null}
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

          <section className="bg-card rounded-card px-[18px] py-[18px] sm:px-[22px]">
            <h2 className="text-foreground mb-3 text-[0.9375rem] font-semibold">
              ML Explain
            </h2>
            <ConfidenceBar value={victim.confidence} className="mb-3.5" />
            {reasons.length === 0 ? (
              <p className="text-dim text-[0.8125rem]">
                Belum ada alasan triage.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {reasons.map((r, i) => (
                  <li
                    key={`${i}-${r.slice(0, 24)}`}
                    className="bg-surface-header text-muted rounded-md px-2.5 py-1.5 text-xs leading-snug"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                        SpO2
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        RR
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        BP
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Bat
                      </th>
                      <th className="px-[18px] py-2.5 font-semibold sm:px-[22px]">
                        Prio
                      </th>
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
                            {formatRelativeWib(r.deviceTs ?? r.createdAt, now)}
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
                          <td className="px-3 py-2.5 text-right">
                            <VitalCell
                              label="RR"
                              value={r.rr}
                              kind="rr"
                              variant="inline"
                            />
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
                        <span className="text-muted font-mono text-xs tabular-nums">
                          {formatConfidence(h.confidence)}
                        </span>
                      </div>
                      <p className="text-dim mt-1 font-mono text-[0.6875rem] tabular-nums">
                        {formatRelativeWib(h.createdAt, now)}
                      </p>
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
    </div>
  );
}

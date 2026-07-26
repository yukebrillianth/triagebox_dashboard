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
      <div data-testid="page-pasien-detail" className="space-y-6 md:space-y-8">
        <EmptyState
          title="ID pasien tidak valid"
          description="Kembali ke daftar pasien."
          action={
            <Link
              href="/pasien"
              className="border-border bg-card text-foreground hover:bg-control-hover inline-flex min-h-11 items-center border px-4 text-sm"
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
      <div data-testid="page-pasien-detail" className="space-y-6 md:space-y-8">
        <div className="border-border bg-card h-24 animate-pulse border" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="border-border bg-card h-64 animate-pulse border lg:col-span-7" />
          <div className="border-border bg-card h-64 animate-pulse border lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (isError && !victim) {
    return (
      <div data-testid="page-pasien-detail" className="space-y-6 md:space-y-8">
        <EmptyState
          title="Pasien tidak ditemukan"
          description={getErrorMessage(error)}
          action={
            <Link
              href="/pasien"
              className="border-border bg-card text-foreground hover:bg-control-hover inline-flex min-h-11 items-center border px-4 text-sm"
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
    <div data-testid="page-pasien-detail" className="space-y-6 md:space-y-8">
      {/* Header strip */}
      <header className="border-border bg-card flex flex-wrap items-center gap-5 border p-4 md:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pasien"
              className="text-muted hover:text-foreground inline-flex min-h-11 items-center text-sm transition-colors"
            >
              <ArrowLeftIcon className="mr-2 size-4" aria-hidden />
              Pasien
            </Link>
            {needsReg ? (
              <span
                data-testid="badge-perlu-registrasi"
                className="text-triage-yellow border-triage-yellow border-l-2 pl-2 text-sm font-semibold"
              >
                Perlu registrasi
              </span>
            ) : null}
          </div>
          <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
            {victim.name?.trim() || 'Belum terdaftar'}
          </h1>
          <p className="text-muted mt-1 font-mono text-sm tabular-nums">
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
          <PriorityBadge priority={victim.currentPriority} />
          <div className="min-w-24">
            <span className="text-muted block text-sm font-medium">
              Confidence
            </span>
            <span className="text-foreground font-mono text-base tabular-nums">
              {formatConfidence(victim.confidence)}
            </span>
          </div>
          {victim.currentNodeId ? (
            <Link
              href={`/perangkat?node=${encodeURIComponent(victim.currentNodeId)}`}
              className="border-border bg-background hover:border-accent hover:bg-control-hover text-foreground inline-flex min-h-11 items-center border px-3 font-mono text-sm tabular-nums transition-colors"
              title="Node aktif"
            >
              Node {victim.currentNodeId}
            </Link>
          ) : (
            <span className="text-muted text-sm">Node -</span>
          )}
          <StaleIndicator lastUpdate={victim.lastUpdate} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: vitals + ML */}
        <div className="space-y-6 lg:col-span-7">
          <section className="border-border bg-card border p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Vitals live
              </h2>
              <span
                className={cn(
                  'border-l-2 pl-2 text-sm font-semibold',
                  stale ? 'border-border' : 'border-accent',
                  stale ? 'text-muted' : 'text-accent'
                )}
              >
                {stale ? 'Data lama' : 'Live'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <VitalCell
                label="HR"
                value={hr}
                unit="bpm"
                stale={stale}
                data-testid="vital-hr"
              />
              <VitalCell
                label="SpO2"
                value={spo2}
                unit="%"
                stale={stale}
                data-testid="vital-spo2"
              />
              <VitalCell
                label="RR"
                value={rr}
                unit="/m"
                stale={stale}
                data-testid="vital-rr"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-muted text-sm font-medium">BP</span>
                <span
                  data-testid="vital-bp"
                  className={cn(
                    'text-base font-semibold tabular-nums',
                    stale ? 'text-muted' : 'text-foreground'
                  )}
                >
                  {formatBp(bpSys, bpDia)}
                  {bpSys != null && bpDia != null ? (
                    <span className="text-muted ml-1 text-sm font-normal">
                      mmHg
                    </span>
                  ) : null}
                </span>
              </div>
              <VitalCell
                label="Battery"
                value={battery}
                unit="%"
                stale={stale}
                data-testid="vital-battery"
              />
            </div>
          </section>

          <section className="border-border bg-card border p-4 md:p-6">
            <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
              ML Explain
            </h2>
            <ConfidenceBar value={victim.confidence} className="mb-4" />
            {reasons.length === 0 ? (
              <p className="text-muted text-sm">Belum ada alasan triage.</p>
            ) : (
              <ul className="space-y-2">
                {reasons.map((r, i) => (
                  <li
                    key={`${i}-${r.slice(0, 24)}`}
                    className="border-border bg-background text-foreground flex gap-3 border px-3 py-2 text-sm leading-relaxed"
                  >
                    <span className="text-accent font-mono tabular-nums">
                      {i + 1}.
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            data-testid="vitals-history"
            className="border-border bg-card border p-4 md:p-6"
          >
            <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
              Riwayat vital
            </h2>
            {vitalsHistory?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-muted border-border border-b text-left text-sm font-semibold">
                      <th className="py-3 pr-3">Waktu</th>
                      <th className="py-3 pr-3">HR</th>
                      <th className="py-3 pr-3">SpO2</th>
                      <th className="py-3 pr-3">RR</th>
                      <th className="py-3 pr-3">BP</th>
                      <th className="py-3 pr-3">Bat</th>
                      <th className="py-3">Prio</th>
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
                          className="border-border/60 border-b last:border-0"
                        >
                          <td className="text-muted py-3 pr-3 font-mono whitespace-nowrap tabular-nums">
                            {formatRelativeWib(r.deviceTs ?? r.createdAt, now)}
                          </td>
                          <td className="text-foreground py-3 pr-3 font-mono tabular-nums">
                            {r.hr ?? '-'}
                          </td>
                          <td className="text-foreground py-3 pr-3 font-mono tabular-nums">
                            {r.spo2 ?? '-'}
                          </td>
                          <td className="text-foreground py-3 pr-3 font-mono tabular-nums">
                            {r.rr ?? '-'}
                          </td>
                          <td className="text-foreground py-3 pr-3 font-mono whitespace-nowrap tabular-nums">
                            {formatBp(r.bpSys, r.bpDia)}
                          </td>
                          <td className="text-foreground py-3 pr-3 font-mono tabular-nums">
                            {r.battery ?? '-'}
                          </td>
                          <td className="py-3">
                            {prio ? (
                              <PriorityBadge priority={prio} />
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm">Belum ada riwayat vital</p>
            )}
          </section>
        </div>

        {/* Right: form + history */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader
              title="Registrasi"
              className="px-4 py-4 md:px-6"
              action={
                <span className="text-muted text-sm">
                  Prioritas ML (readonly)
                </span>
              }
            />
            <CardBody className="space-y-4 p-4 md:p-6">
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

          <section className="border-border bg-card border p-4 md:p-6">
            <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
              Riwayat triage
            </h2>
            {historyLoading && !triageHistory ? (
              <div className="border-border bg-background h-24 animate-pulse rounded-sm border" />
            ) : !triageHistory || triageHistory.length === 0 ? (
              <p className="text-muted text-sm">
                Belum ada perubahan prioritas.
              </p>
            ) : (
              <ol className="border-border relative space-y-0 border-l pl-4">
                {triageHistory.map((h: TriageHistory) => {
                  const to = asPriority(h.toPriority);
                  const from = asPriority(h.fromPriority ?? null);
                  return (
                    <li key={h.id} className="relative pb-4 last:pb-0">
                      <span className="bg-accent absolute top-2 -left-[calc(0.25rem+1px)] size-2" />
                      <div className="flex flex-wrap items-center gap-2">
                        {from ? <PriorityBadge priority={from} /> : null}
                        {from ? (
                          <span className="text-muted text-sm">→</span>
                        ) : null}
                        {to ? (
                          <PriorityBadge priority={to} />
                        ) : (
                          <span className="text-foreground text-sm font-semibold">
                            {h.toPriority}
                          </span>
                        )}
                        <span className="text-muted font-mono text-sm tabular-nums">
                          {formatConfidence(h.confidence)}
                        </span>
                      </div>
                      <p className="text-muted mt-1 font-mono text-sm tabular-nums">
                        {formatRelativeWib(h.createdAt, now)}
                      </p>
                      {h.reasons?.length ? (
                        <p className="text-muted mt-1 line-clamp-2 text-sm">
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

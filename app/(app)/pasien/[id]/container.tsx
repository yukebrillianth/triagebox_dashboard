'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

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

  const {
    data: victim,
    isLoading,
    isError,
    error,
  } = useVictim(id);

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
      <div data-testid="page-pasien-detail" className="space-y-3">
        <EmptyState
          title="ID pasien tidak valid"
          description="Kembali ke daftar pasien."
          action={
            <Link
              href="/pasien"
              className="border-border bg-card text-foreground rounded-sm border px-3 py-1.5 text-xs"
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
      <div data-testid="page-pasien-detail" className="space-y-3">
        <div className="border-border bg-card h-16 animate-pulse rounded-md border" />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="border-border bg-card h-64 animate-pulse rounded-md border" />
          <div className="border-border bg-card h-64 animate-pulse rounded-md border" />
        </div>
      </div>
    );
  }

  if (isError && !victim) {
    return (
      <div data-testid="page-pasien-detail" className="space-y-3">
        <EmptyState
          title="Pasien tidak ditemukan"
          description={getErrorMessage(error)}
          action={
            <Link
              href="/pasien"
              className="border-border bg-card text-foreground rounded-sm border px-3 py-1.5 text-xs"
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
    <div data-testid="page-pasien-detail" className="space-y-3">
      {/* Header strip */}
      <header className="border-border bg-card flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pasien"
              className="text-muted hover:text-foreground text-xs transition-colors"
            >
              ← Pasien
            </Link>
            {needsReg ? (
              <span
                data-testid="badge-perlu-registrasi"
                className="bg-triage-yellow/15 text-triage-yellow border-triage-yellow/40 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
              >
                Perlu registrasi
              </span>
            ) : null}
          </div>
          <h1 className="text-foreground mt-1 text-lg font-semibold tracking-tight">
            {victim.name?.trim() || 'Belum terdaftar'}
          </h1>
          <p className="text-muted mt-0.5 font-mono text-xs tabular-nums">
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

        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={victim.currentPriority} />
          <div className="min-w-[5rem]">
            <span className="text-muted block text-[10px] font-medium tracking-wide uppercase">
              Confidence
            </span>
            <span className="text-foreground font-mono text-sm tabular-nums">
              {formatConfidence(victim.confidence)}
            </span>
          </div>
          {victim.currentNodeId ? (
            <Link
              href={`/perangkat?node=${encodeURIComponent(victim.currentNodeId)}`}
              className="border-border bg-background hover:border-accent text-foreground rounded-sm border px-2 py-1 font-mono text-xs tabular-nums transition-colors"
              title="Node aktif"
            >
              Node {victim.currentNodeId}
            </Link>
          ) : (
            <span className="text-muted text-xs">Node —</span>
          )}
          <StaleIndicator lastUpdate={victim.lastUpdate} />
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Left: vitals + ML */}
        <div className="space-y-3">
          <section className="border-border bg-card rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                Vitals live
              </h2>
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide uppercase',
                  stale ? 'text-muted' : 'text-accent'
                )}
              >
                {stale ? 'Stale' : 'Live'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-muted text-[10px] font-medium tracking-wide uppercase">
                  BP
                </span>
                <span
                  data-testid="vital-bp"
                  className={cn(
                    'tabular-nums text-sm font-semibold',
                    stale ? 'text-muted' : 'text-foreground'
                  )}
                >
                  {formatBp(bpSys, bpDia)}
                  {bpSys != null && bpDia != null ? (
                    <span className="text-muted ml-0.5 text-xs font-normal">
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

          <section className="border-border bg-card rounded-md border p-3">
            <h2 className="text-foreground mb-2 text-sm font-semibold tracking-tight">
              ML Explain
            </h2>
            <ConfidenceBar value={victim.confidence} className="mb-3" />
            {reasons.length === 0 ? (
              <p className="text-muted text-xs">Belum ada alasan triage.</p>
            ) : (
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li
                    key={`${i}-${r.slice(0, 24)}`}
                    className="border-border bg-background text-foreground flex gap-2 rounded-sm border px-2 py-1.5 text-xs leading-relaxed"
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
        </div>

        {/* Right: form + history */}
        <div className="space-y-3">
          <section className="border-border bg-card rounded-md border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                Registrasi
              </h2>
              <span className="text-muted text-[10px] tracking-wide uppercase">
                Prioritas ML (readonly)
              </span>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-2.5"
              noValidate
            >
              <div>
                <label
                  htmlFor="input-name"
                  className="text-muted mb-1 block text-[11px] font-medium tracking-wide uppercase"
                >
                  Nama <span className="text-triage-red">*</span>
                </label>
                <input
                  id="input-name"
                  data-testid="input-name"
                  type="text"
                  autoComplete="name"
                  maxLength={128}
                  className={cn(
                    'border-border bg-background text-foreground placeholder:text-muted focus:border-accent h-9 w-full rounded-sm border px-2.5 text-sm outline-none',
                    errors.name && 'border-triage-red'
                  )}
                  placeholder="Nama korban"
                  {...register('name')}
                />
                {errors.name ? (
                  <p className="text-triage-red mt-1 text-[11px]">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="input-age"
                    className="text-muted mb-1 block text-[11px] font-medium tracking-wide uppercase"
                  >
                    Usia
                  </label>
                  <input
                    id="input-age"
                    data-testid="input-age"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={150}
                    className={cn(
                      'border-border bg-background text-foreground placeholder:text-muted focus:border-accent h-9 w-full rounded-sm border px-2.5 font-mono text-sm tabular-nums outline-none',
                      errors.age && 'border-triage-red'
                    )}
                    placeholder="—"
                    {...register('age')}
                  />
                  {errors.age ? (
                    <p className="text-triage-red mt-1 text-[11px]">
                      {errors.age.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="select-gender"
                    className="text-muted mb-1 block text-[11px] font-medium tracking-wide uppercase"
                  >
                    Gender
                  </label>
                  <select
                    id="select-gender"
                    data-testid="select-gender"
                    className={cn(
                      'border-border bg-background text-foreground focus:border-accent h-9 w-full rounded-sm border px-2 text-sm outline-none',
                      errors.gender && 'border-triage-red'
                    )}
                    {...register('gender')}
                  >
                    <option value="">—</option>
                    <option value="M">L (Laki-laki)</option>
                    <option value="F">P (Perempuan)</option>
                    <option value="U">U (Tidak diketahui)</option>
                  </select>
                  {errors.gender ? (
                    <p className="text-triage-red mt-1 text-[11px]">
                      {errors.gender.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-notes"
                  className="text-muted mb-1 block text-[11px] font-medium tracking-wide uppercase"
                >
                  Catatan
                </label>
                <textarea
                  id="input-notes"
                  data-testid="input-notes"
                  rows={3}
                  maxLength={1024}
                  className={cn(
                    'border-border bg-background text-foreground placeholder:text-muted focus:border-accent w-full resize-y rounded-sm border px-2.5 py-2 text-sm outline-none',
                    errors.notes && 'border-triage-red'
                  )}
                  placeholder="Catatan medis / lokasi / kontak…"
                  {...register('notes')}
                />
                {errors.notes ? (
                  <p className="text-triage-red mt-1 text-[11px]">
                    {errors.notes.message}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  data-testid="btn-save-registrasi"
                  disabled={isSubmitting}
                  className="bg-accent text-background hover:bg-accent/90 disabled:bg-muted h-9 rounded-sm px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan…' : 'Simpan registrasi'}
                </button>
              </div>
            </form>
          </section>

          <section className="border-border bg-card rounded-md border p-3">
            <h2 className="text-foreground mb-2 text-sm font-semibold tracking-tight">
              Riwayat triage
            </h2>
            {historyLoading && !triageHistory ? (
              <div className="border-border bg-background h-24 animate-pulse rounded-sm border" />
            ) : !triageHistory || triageHistory.length === 0 ? (
              <p className="text-muted text-xs">Belum ada perubahan prioritas.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-border pl-3">
                {triageHistory.map((h: TriageHistory) => {
                  const to = asPriority(h.toPriority);
                  const from = asPriority(h.fromPriority ?? null);
                  return (
                    <li key={h.id} className="relative pb-3 last:pb-0">
                      <span className="bg-accent absolute top-1.5 -left-[calc(0.375rem+1px)] size-1.5 rounded-full" />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {from ? <PriorityBadge priority={from} /> : null}
                        {from ? (
                          <span className="text-muted text-[10px]">→</span>
                        ) : null}
                        {to ? (
                          <PriorityBadge priority={to} />
                        ) : (
                          <span className="text-foreground text-xs font-semibold">
                            {h.toPriority}
                          </span>
                        )}
                        <span className="text-muted font-mono text-[11px] tabular-nums">
                          {formatConfidence(h.confidence)}
                        </span>
                      </div>
                      <p className="text-muted mt-0.5 font-mono text-[11px] tabular-nums">
                        {formatRelativeWib(h.createdAt, now)}
                      </p>
                      {h.reasons?.length ? (
                        <p className="text-muted mt-0.5 line-clamp-2 text-[11px]">
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

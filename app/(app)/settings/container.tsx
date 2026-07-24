'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { queryKeys, useSettings } from '@/hooks/use-api';
import { useRealtime } from '@/hooks/use-realtime';
import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/config';
import { cn } from '@/lib/cn';
import { getErrorMessage, getValidationErrors } from '@/lib/http-error';
import {
  settingsFormSchema,
  type SettingsForm,
  type SettingsFormValues,
} from '@/schemas/settings';

function formDefaults(s?: Record<string, string>): SettingsFormValues {
  return {
    hospital_name: s?.hospital_name ?? '',
    disaster_name: s?.disaster_name ?? '',
    operator: s?.operator ?? '',
  };
}

export function SettingsContainer() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error, refetch } = useSettings();
  const { soundEnabled, setSoundEnabled } = useRealtime();
  const apiUrl = getApiBaseUrl();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues, unknown, SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: formDefaults(),
  });

  useEffect(() => {
    if (!settings) return;
    reset(formDefaults(settings));
  }, [settings, reset]);

  async function onSubmit(values: SettingsForm) {
    try {
      const body: Record<string, string> = {
        hospital_name: values.hospital_name.trim(),
        disaster_name: values.disaster_name.trim(),
      };
      const op = values.operator?.trim() ?? '';
      if (op) body.operator = op;
      else body.operator = '';

      const updated = await api.putSettings(body);
      queryClient.setQueryData(queryKeys.settings, updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      reset(formDefaults(updated));
      toast.success('Pengaturan tersimpan');
    } catch (err) {
      const fieldErrors = getValidationErrors(err);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (
            field === 'hospital_name' ||
            field === 'disaster_name' ||
            field === 'operator'
          ) {
            setError(field, { type: 'server', message });
          }
        }
      }
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading && !settings) {
    return (
      <div data-testid="page-settings" className="space-y-4">
        <header>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Pengaturan
          </h1>
          <p className="text-muted mt-1 text-sm">Memuat…</p>
        </header>
        <div className="border-border bg-card h-48 animate-pulse rounded-md border" />
      </div>
    );
  }

  return (
    <div data-testid="page-settings" className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Pengaturan
        </h1>
        <p className="text-muted mt-1 text-sm">
          Nama rumah sakit, bencana, operator, dan preferensi lokal.
        </p>
      </header>

      {isError && !settings ? (
        <div className="border-triage-red/40 bg-triage-red/5 rounded-md border px-3 py-2 text-sm">
          <p className="text-triage-red font-medium">Gagal memuat pengaturan</p>
          <p className="text-muted mt-0.5 text-xs">
            {error instanceof Error ? error.message : 'Error tidak diketahui'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-accent mt-2 text-xs font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      <form
        data-testid="settings-form"
        onSubmit={handleSubmit(onSubmit)}
        className="border-border bg-card space-y-4 rounded-md border p-4"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="hospital_name"
            className="text-foreground text-xs font-medium"
          >
            Nama rumah sakit
          </label>
          <input
            id="hospital_name"
            data-testid="input-hospital"
            type="text"
            autoComplete="organization"
            {...register('hospital_name')}
            className={cn(
              'border-border bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-accent/30 w-full rounded-sm border px-3 py-2 text-sm outline-none focus:ring-1',
              errors.hospital_name && 'border-triage-red'
            )}
            placeholder="RS Lapangan A"
          />
          {errors.hospital_name ? (
            <p className="text-triage-red text-xs">
              {errors.hospital_name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="disaster_name"
            className="text-foreground text-xs font-medium"
          >
            Nama bencana / insiden
          </label>
          <input
            id="disaster_name"
            data-testid="input-disaster"
            type="text"
            {...register('disaster_name')}
            className={cn(
              'border-border bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-accent/30 w-full rounded-sm border px-3 py-2 text-sm outline-none focus:ring-1',
              errors.disaster_name && 'border-triage-red'
            )}
            placeholder="Gempa Demo 2026"
          />
          {errors.disaster_name ? (
            <p className="text-triage-red text-xs">
              {errors.disaster_name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="operator"
            className="text-foreground text-xs font-medium"
          >
            Operator <span className="text-muted font-normal">(opsional)</span>
          </label>
          <input
            id="operator"
            data-testid="input-operator"
            type="text"
            autoComplete="name"
            {...register('operator')}
            className={cn(
              'border-border bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-accent/30 w-full rounded-sm border px-3 py-2 text-sm outline-none focus:ring-1',
              errors.operator && 'border-triage-red'
            )}
            placeholder="Nama operator"
          />
          {errors.operator ? (
            <p className="text-triage-red text-xs">{errors.operator.message}</p>
          ) : null}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            data-testid="btn-save-settings"
            disabled={isSubmitting || !isDirty}
            className="bg-accent text-background hover:bg-accent/90 rounded-sm px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>

      <section
        data-testid="settings-sound"
        className="border-border bg-card space-y-3 rounded-md border p-4"
      >
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          Suara alert
        </h2>
        <p className="text-muted text-xs">
          Toggle lokal di browser ini (tidak dikirim ke server).
        </p>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            data-testid="toggle-sound"
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="border-border text-accent focus:ring-accent size-4 rounded-sm"
          />
          <span className="text-foreground text-sm">
            {soundEnabled ? 'Suara aktif' : 'Suara dimatikan'}
          </span>
        </label>
      </section>

      <section
        data-testid="settings-api-url"
        className="border-border bg-card space-y-2 rounded-md border p-4"
      >
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          Koneksi API
        </h2>
        <p className="text-muted text-xs">
          URL backend (hanya tampilan, diubah lewat env{' '}
          <code className="font-mono">NEXT_PUBLIC_API_URL</code>).
        </p>
        <p
          data-testid="display-api-url"
          className="text-foreground border-border bg-background rounded-sm border px-3 py-2 font-mono text-xs break-all"
        >
          {apiUrl}
        </p>
      </section>
    </div>
  );
}

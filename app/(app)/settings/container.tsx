'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
} from '@/components/ui';
import { queryKeys, useSettings } from '@/hooks/use-api';
import { useRealtime } from '@/hooks/use-realtime';
import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/config';
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
        <div className="border-border bg-card h-48 animate-pulse border" />
      </div>
    );
  }

  return (
    <div data-testid="page-settings" className="space-y-4">
      <header className="border-border bg-card border px-4 py-3">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Pengaturan
        </h1>
        <p className="text-muted mt-1 text-sm">
          Identitas operasional, preferensi lokal, dan status koneksi API.
        </p>
      </header>

      {isError && !settings ? (
        <Card className="border-triage-red">
          <CardBody className="space-y-2">
            <p className="text-triage-red font-semibold">
              Gagal memuat pengaturan
            </p>
            <p className="text-muted text-sm">
              {error instanceof Error ? error.message : 'Error tidak diketahui'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
            >
              Coba lagi
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="settings-form-card" className="lg:col-span-2">
          <CardHeader
            title="Identitas operasional"
            description="Nama RS, bencana, dan operator yang tampil di topbar."
          />
          <CardBody>
            <form
              data-testid="settings-form"
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <Field
                label="Nama rumah sakit"
                htmlFor="hospital_name"
                required
                error={errors.hospital_name?.message}
                className="sm:col-span-1"
              >
                <Input
                  id="hospital_name"
                  data-testid="input-hospital"
                  type="text"
                  autoComplete="organization"
                  placeholder="RS Lapangan A"
                  {...register('hospital_name')}
                />
              </Field>

              <Field
                label="Nama bencana / insiden"
                htmlFor="disaster_name"
                required
                error={errors.disaster_name?.message}
                className="sm:col-span-1"
              >
                <Input
                  id="disaster_name"
                  data-testid="input-disaster"
                  type="text"
                  placeholder="Gempa Demo 2026"
                  {...register('disaster_name')}
                />
              </Field>

              <Field
                label="Operator"
                htmlFor="operator"
                optional
                error={errors.operator?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="operator"
                  data-testid="input-operator"
                  type="text"
                  autoComplete="name"
                  placeholder="Nama operator"
                  {...register('operator')}
                />
              </Field>

              <div className="flex justify-end sm:col-span-2">
                <Button
                  type="submit"
                  data-testid="btn-save-settings"
                  disabled={isSubmitting || !isDirty}
                >
                  {isSubmitting ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card data-testid="settings-sound">
          <CardHeader
            title="Suara alert"
            description="Preferensi lokal browser ini. Tidak dikirim ke server."
          />
          <CardBody>
            <label className="border-border bg-background hover:bg-control-hover flex min-h-11 cursor-pointer items-center gap-3 border px-3">
              <input
                data-testid="toggle-sound"
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="border-border text-accent size-5 shrink-0 border accent-[var(--accent)]"
              />
              <span className="text-foreground text-sm font-medium">
                {soundEnabled ? 'Suara aktif' : 'Suara dimatikan'}
              </span>
            </label>
          </CardBody>
        </Card>

        <Card data-testid="settings-api-url">
          <CardHeader
            title="Koneksi API"
            description={
              <>
                Hanya tampilan. Ubah lewat env{' '}
                <code className="font-mono">NEXT_PUBLIC_API_URL</code>.
              </>
            }
          />
          <CardBody>
            <p
              data-testid="display-api-url"
              className="border-border bg-background text-foreground border px-3 py-3 font-mono text-sm break-all"
            >
              {apiUrl}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

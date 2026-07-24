'use client';

import { useEffect, useState } from 'react';

import { Volume2, VolumeX } from 'lucide-react';

import { useSettings } from '@/hooks/use-api';
import {
  useRealtime,
  type ConnectionStatus,
} from '@/hooks/use-realtime';
import { cn } from '@/lib/cn';

function connectionLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Terhubung';
    case 'connecting':
      return 'Menghubungkan';
    case 'offline':
      return 'Offline';
  }
}

function connectionClass(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'text-triage-green';
    case 'connecting':
      return 'text-triage-yellow';
    case 'offline':
      return 'text-triage-red';
  }
}

function formatLastUpdate(ts: number | null, now: number): string {
  if (ts == null) return '—';
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (diffSec < 5) return 'baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AppTopbar() {
  const { data: settings } = useSettings();
  const {
    connectionStatus,
    lastBootstrapAt,
    soundEnabled,
    setSoundEnabled,
  } = useRealtime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hospital = settings?.hospital_name ?? '—';
  const disaster = settings?.disaster_name ?? '—';

  return (
    <header
      data-testid="app-topbar"
      className="bg-card border-border print:hidden flex h-12 shrink-0 items-center gap-3 border-b px-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold tracking-tight">
          TriageBox
        </p>
        <p
          data-testid="topbar-context"
          className="text-muted truncate text-[11px] leading-tight"
        >
          {hospital}
          <span className="mx-1.5 opacity-40">·</span>
          {disaster}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span
          data-testid="connection-badge"
          className={cn(
            'inline-flex items-center gap-1.5 font-medium',
            connectionClass(connectionStatus)
          )}
        >
          <span
            className={cn(
              'inline-block size-1.5 rounded-full',
              connectionStatus === 'connected' && 'bg-triage-green',
              connectionStatus === 'connecting' && 'bg-triage-yellow',
              connectionStatus === 'offline' && 'bg-triage-red'
            )}
            aria-hidden
          />
          {connectionLabel(connectionStatus)}
        </span>

        <button
          type="button"
          data-testid="mute-toggle"
          aria-label={soundEnabled ? 'Bisukan suara' : 'Nyalakan suara'}
          aria-pressed={!soundEnabled}
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            'hover:bg-background inline-flex size-8 items-center justify-center rounded-sm transition-colors',
            soundEnabled ? 'text-foreground' : 'text-muted'
          )}
        >
          {soundEnabled ? (
            <Volume2 className="size-4" aria-hidden />
          ) : (
            <VolumeX className="size-4" aria-hidden />
          )}
        </button>

        <span
          data-testid="last-update"
          className="text-muted tabular-nums"
          title={
            lastBootstrapAt
              ? new Date(lastBootstrapAt).toLocaleString('id-ID')
              : undefined
          }
        >
          Update: {formatLastUpdate(lastBootstrapAt, now)}
        </span>
      </div>
    </header>
  );
}

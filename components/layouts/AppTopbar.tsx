'use client';

import { useEffect, useState } from 'react';

import { Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';

import { useSettings } from '@/hooks/use-api';
import { useRealtime, type ConnectionStatus } from '@/hooks/use-realtime';
import { useTheme } from '@/hooks/use-theme';
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
  if (ts == null) return '-';
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (diffSec < 5) return 'baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function formatWibClock(now: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(now));
}

type AppTopbarProps = {
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
};

export function AppTopbar({
  mobileNavOpen = false,
  onToggleMobileNav,
}: AppTopbarProps) {
  const { data: settings } = useSettings();
  const { connectionStatus, lastBootstrapAt, soundEnabled, setSoundEnabled } =
    useRealtime();
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hospital = settings?.hospital_name ?? '-';
  const disaster = settings?.disaster_name ?? '-';
  const wibLabel = formatWibClock(now);

  return (
    <header
      data-testid="app-topbar"
      className="bg-surface-sidebar border-border flex h-[var(--shell-header-height)] shrink-0 items-center gap-3 border-b px-3 sm:px-4 lg:px-6 print:hidden"
    >
      <button
        type="button"
        id="menu-toggle"
        data-testid="menu-toggle"
        aria-label={mobileNavOpen ? 'Tutup navigasi' : 'Buka navigasi'}
        aria-expanded={mobileNavOpen}
        aria-controls="app-sidebar"
        onClick={onToggleMobileNav}
        className="rounded-control hover:bg-control-hover text-foreground inline-flex size-11 shrink-0 items-center justify-center transition-colors lg:hidden"
      >
        {mobileNavOpen ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold tracking-tight">
          TriageBox
        </p>
        <p
          data-testid="topbar-context"
          className="text-muted truncate text-xs leading-tight"
        >
          {hospital}
          <span className="mx-1.5 opacity-40">·</span>
          {disaster}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs sm:gap-3">
        <time
          id="wib-clock"
          data-testid="wib-clock"
          dateTime={new Date(now).toISOString()}
          title="Waktu Indonesia Barat"
          className="text-muted hidden min-w-[12.5rem] text-right font-medium tabular-nums sm:block"
        >
          {wibLabel} WIB
        </time>

        <span
          data-testid="connection-badge"
          className={cn(
            'inline-flex items-center gap-2 font-semibold',
            connectionClass(connectionStatus)
          )}
        >
          <span
            className={cn(
              'inline-block size-2 shrink-0',
              connectionStatus === 'connected' && 'bg-triage-green',
              connectionStatus === 'connecting' && 'bg-triage-yellow',
              connectionStatus === 'offline' && 'bg-triage-red'
            )}
            aria-hidden
          />
          <span className="hidden sm:inline">
            {connectionLabel(connectionStatus)}
          </span>
        </span>

        <button
          type="button"
          id="theme-toggle"
          data-testid="theme-toggle"
          aria-label={
            theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
          }
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
          className="rounded-control hover:bg-control-hover text-foreground inline-flex size-11 items-center justify-center transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="size-5" aria-hidden />
          ) : (
            <Moon className="size-5" aria-hidden />
          )}
        </button>

        <button
          type="button"
          id="mute-toggle"
          data-testid="mute-toggle"
          aria-label={soundEnabled ? 'Bisukan suara' : 'Nyalakan suara'}
          aria-pressed={!soundEnabled}
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            'rounded-control hover:bg-control-hover inline-flex size-11 items-center justify-center transition-colors',
            soundEnabled ? 'text-foreground' : 'text-muted'
          )}
        >
          {soundEnabled ? (
            <Volume2 className="size-5" aria-hidden />
          ) : (
            <VolumeX className="size-5" aria-hidden />
          )}
        </button>

        <span
          data-testid="last-update"
          className="text-dim hidden tabular-nums md:inline"
          title={
            lastBootstrapAt
              ? new Date(lastBootstrapAt).toLocaleString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                })
              : undefined
          }
        >
          Update: {formatLastUpdate(lastBootstrapAt, now)}
        </span>
      </div>
    </header>
  );
}

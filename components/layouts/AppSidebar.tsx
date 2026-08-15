'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAlerts } from '@/hooks/use-api';
import { cn } from '@/lib/cn';
import { getApiBaseUrl } from '@/lib/config';

import { isNavActive, NAV_GROUPS } from './nav';

type AppSidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
};

export function AppSidebar({
  mobileOpen = false,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { data: alerts } = useAlerts({ acked: false, limit: 100 });
  const unackedCount = alerts?.length ?? 0;
  // Host only: the full URL wraps awkwardly in a 236px rail.
  const apiHost = getApiBaseUrl().replace(/^https?:\/\//, '');

  return (
    <>
      <div
        data-testid="sidebar-overlay"
        aria-hidden={!mobileOpen}
        className={cn(
          'fixed inset-0 z-40 bg-[var(--backdrop)] transition-opacity lg:hidden print:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        data-testid="app-sidebar"
        id="app-sidebar"
        aria-label="Navigasi utama"
        className={cn(
          'bg-surface-sidebar fixed inset-y-0 left-0 z-50 flex w-[var(--shell-sidebar-width)] max-w-[85vw] shrink-0 flex-col transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="border-border flex h-[var(--shell-header-height)] shrink-0 items-center border-b px-[18px]">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex min-w-0 items-center"
            aria-label="TriageBox beranda"
          >
            {/* Design fixes the logo at 30px tall and lets width follow. */}
            <span className="relative block h-[30px] w-[8.75rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-dark-transparant.png"
                alt="TriageBox"
                width={140}
                height={30}
                className="absolute inset-0 h-[30px] w-auto max-w-[8.75rem] object-contain object-left dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-light-transparant.png"
                alt=""
                width={140}
                height={30}
                aria-hidden
                className="absolute inset-0 hidden h-[30px] w-auto max-w-[8.75rem] object-contain object-left dark:block"
              />
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-[1.125rem] overflow-y-auto px-2.5 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="text-dim px-2 pb-1 text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  const showBadge = item.badge === 'alerts' && unackedCount > 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1).replace(/\//g, '-')}`}
                        className={cn(
                          'rounded-control relative flex min-h-11 items-center gap-3 py-2 pr-3 pl-3 text-sm transition-colors',
                          active
                            ? 'bg-chip text-accent font-semibold'
                            : 'text-muted hover:bg-control-hover hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r',
                            active ? 'bg-accent' : 'bg-transparent'
                          )}
                          aria-hidden
                        />
                        <Icon className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {showBadge ? (
                          <span
                            data-testid="nav-alert-badge"
                            className="bg-triage-red ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold text-white tabular-nums"
                          >
                            {unackedCount > 99 ? '99+' : unackedCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-border flex flex-col gap-1 border-t px-4 py-3.5">
          <span className="text-dim text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
            Backend
          </span>
          <span className="text-muted truncate font-mono text-[0.6875rem] tabular-nums">
            {apiHost}
          </span>
        </div>
      </aside>
    </>
  );
}

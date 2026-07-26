'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAlerts } from '@/hooks/use-api';
import { cn } from '@/lib/cn';

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
          'bg-card border-border fixed inset-y-0 left-0 z-50 flex w-[var(--shell-sidebar-width)] max-w-[85vw] shrink-0 flex-col border-r transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="border-border flex h-[var(--shell-header-height)] shrink-0 items-center border-b px-4">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex min-h-11 min-w-0 items-center gap-3"
            aria-label="TriageBox beranda"
          >
            <span className="relative block h-9 w-[10.5rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-dark-transparant.png"
                alt="TriageBox"
                width={160}
                height={36}
                className="absolute inset-0 h-9 w-auto max-w-[10.5rem] object-contain object-left dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-light-transparant.png"
                alt=""
                width={160}
                height={36}
                aria-hidden
                className="absolute inset-0 hidden h-9 w-auto max-w-[10.5rem] object-contain object-left dark:block"
              />
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-muted mb-2 px-2 text-xs font-medium tracking-wide">
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
                          'flex min-h-11 items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors',
                          active
                            ? 'border-accent bg-surface-muted text-accent font-semibold'
                            : 'text-muted hover:bg-control-hover hover:text-foreground border-transparent'
                        )}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {showBadge ? (
                          <span
                            data-testid="nav-alert-badge"
                            className="text-triage-red border-triage-red ml-auto inline-flex min-h-6 min-w-6 items-center justify-center border px-1.5 text-xs font-semibold tabular-nums"
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
      </aside>
    </>
  );
}

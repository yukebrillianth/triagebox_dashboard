'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAlerts } from '@/hooks/use-api';
import { cn } from '@/lib/cn';

import { isNavActive, NAV_GROUPS } from './nav';

export function AppSidebar() {
  const pathname = usePathname();
  const { data: alerts } = useAlerts({ acked: false, limit: 50 });
  const unackedCount = alerts?.length ?? 0;

  return (
    <aside
      data-testid="app-sidebar"
      className="bg-card border-border print:hidden flex h-full w-60 shrink-0 flex-col border-r"
    >
      <div className="border-border border-b px-4 py-3">
        <Link
          href="/"
          className="text-foreground text-sm font-semibold tracking-tight"
        >
          TriageBox
        </Link>
        <p className="text-muted mt-0.5 text-[11px] leading-tight">
          Command Center
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-muted mb-1 px-2 text-[10px] font-medium tracking-wider uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                const showBadge =
                  item.badge === 'alerts' && unackedCount > 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1).replace(/\//g, '-')}`}
                      className={cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-accent/10 text-accent border-accent border-l-2 pl-[6px] font-medium'
                          : 'text-muted hover:bg-card hover:text-foreground border-l-2 border-transparent'
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {showBadge ? (
                        <span
                          data-testid="nav-alert-badge"
                          className="bg-triage-red text-foreground ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
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
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import { OfflineBanner } from '@/components/banners';

import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(
    () => setMobileNavOpen((open) => !open),
    []
  );

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileNav();
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeMobileNav, mobileNavOpen]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (media.matches) setMobileNavOpen(false);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      data-testid="app-shell"
      className="bg-background text-foreground flex h-dvh min-h-0 overflow-hidden"
    >
      <AppSidebar
        mobileOpen={mobileNavOpen}
        onNavigate={closeMobileNav}
        onClose={closeMobileNav}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={toggleMobileNav}
        />
        <OfflineBanner />
        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

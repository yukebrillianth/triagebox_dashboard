'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type ThemeMode,
  writeStoredTheme,
} from '@/lib/theme';

/**
 * The `dark` class on <html> is the source of truth; the inline script in
 * `app/layout.tsx` sets it before paint. This hook subscribes to that class
 * instead of holding its own copy, so there is nothing to get out of sync.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** The server cannot know which theme the bootstrap script will pick. */
function getServerSnapshot(): null {
  return null;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const stored = readStoredTheme();
      if (stored === 'light' || stored === 'dark') return;
      applyTheme(resolveTheme(null, media.matches));
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    applyTheme(mode);
    writeStoredTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}

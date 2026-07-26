'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type ThemeMode,
  writeStoredTheme,
} from '@/lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const stored = readStoredTheme();
      if (stored === 'light' || stored === 'dark') return;
      const next = resolveTheme(null, media.matches);
      applyTheme(next);
      setThemeState(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    applyTheme(mode);
    writeStoredTheme(mode);
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme };
}

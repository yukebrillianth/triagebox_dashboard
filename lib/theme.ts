export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'triagebox.theme';

export function resolveTheme(
  stored: string | null,
  prefersDark: boolean
): ThemeMode {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.dataset.theme = mode;
}

export function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('TriageBox theme preference could not be read.', error);
    return null;
  }
}

export function writeStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('TriageBox theme preference could not be saved.', error);
  }
}

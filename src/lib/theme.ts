import { useEffect, useState } from 'react';
import type { ResolvedTheme, ThemePreference } from '@/theme-types';

const themeStorageKey = 'otter.theme-preference';
const systemDarkQuery = '(prefers-color-scheme: dark)';
const themePreferenceChangedEvent = 'otter-theme-preference-changed';
const themePreferences = new Set<ThemePreference>(['system', 'light', 'dark']);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia(systemDarkQuery).matches ? 'dark' : 'light';
};

const readThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';

  const storedTheme = window.localStorage.getItem(themeStorageKey);

  return themePreferences.has(storedTheme as ThemePreference)
    ? (storedTheme as ThemePreference)
    : 'system';
};

const resolveThemePreference = (
  preference: ThemePreference,
): ResolvedTheme => (preference === 'system' ? getSystemTheme() : preference);

const applyThemePreference = (preference: ThemePreference) => {
  if (typeof document === 'undefined') return;

  const resolvedTheme = resolveThemePreference(preference);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.themePreference = preference;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
};

export const initializeTheme = () => {
  applyThemePreference(readThemePreference());
};

export function useThemePreference() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(readThemePreference()),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(systemDarkQuery);

    const syncTheme = () => {
      applyThemePreference(preference);
      setResolvedTheme(resolveThemePreference(preference));
    };

    syncTheme();
    mediaQuery.addEventListener('change', syncTheme);

    const syncPreference = () => {
      setPreferenceState(readThemePreference());
    };

    window.addEventListener(themePreferenceChangedEvent, syncPreference);
    window.addEventListener('storage', syncPreference);

    return () => {
      mediaQuery.removeEventListener('change', syncTheme);
      window.removeEventListener(themePreferenceChangedEvent, syncPreference);
      window.removeEventListener('storage', syncPreference);
    };
  }, [preference]);

  const setPreference = (nextPreference: ThemePreference) => {
    window.localStorage.setItem(themeStorageKey, nextPreference);
    applyThemePreference(nextPreference);
    setPreferenceState(nextPreference);
    window.dispatchEvent(new Event(themePreferenceChangedEvent));
  };

  return {
    preference,
    resolvedTheme,
    setPreference,
  };
}

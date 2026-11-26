import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

// The only thing Privora stores in the browser: a non-sensitive preference.
export const THEME_STORAGE_KEY = "privora-theme";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Storage blocked (private mode, policy): fall back to system.
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") return darkQuery().matches ? "dark" : "light";
  return pref;
}

export function applyTheme(pref: ThemePreference) {
  document.documentElement.classList.toggle("dark", resolveTheme(pref) === "dark");
}

function saveThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Not critical; the choice still applies for this visit.
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== "system") return;
    const query = darkQuery();
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    saveThemePreference(pref);
    setPreferenceState(pref);
  }, []);

  return { preference, resolved: resolveTheme(preference), setPreference };
}

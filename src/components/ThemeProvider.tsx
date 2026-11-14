import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getStoredTheme,
  isThemePreference,
  resolveTheme,
  resolveSystemTheme,
  setTheme as persistTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export interface ThemeContextValue {
  /** Raw user preference: light | dark | system */
  theme: ThemePreference;
  /** The theme actually applied: system resolved against the OS preference */
  resolvedTheme: ResolvedTheme;
  /** Persist and apply a new preference (no full-page reload) */
  setTheme: (preference: ThemePreference) => void;
  /** Convenience toggle between explicit light and dark (explicit, not system) */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** SSR-deterministic initial state; the pre-paint script owns first paint. */
function initialState(): { theme: ThemePreference; resolvedTheme: ResolvedTheme } {
  if (typeof document === "undefined") {
    return { theme: DEFAULT_THEME, resolvedTheme: "light" };
  }
  const stored = getStoredTheme() ?? DEFAULT_THEME;
  return { theme: stored, resolvedTheme: resolveTheme(stored) };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  // Keep the <html> class in sync whenever the preference changes.
  useEffect(() => {
    applyThemeToDocument(state.resolvedTheme);
  }, [state.resolvedTheme]);

  // Follow OS preference changes while the selected preference is `system`.
  useEffect(() => {
    if (state.theme !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setState((prev) =>
        prev.theme === "system" ? { theme: "system", resolvedTheme: resolveSystemTheme() } : prev,
      );
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [state.theme]);

  // Cross-tab synchronization via the `storage` event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isThemePreference(event.newValue) ? event.newValue : DEFAULT_THEME;
      setState({ theme: next, resolvedTheme: resolveTheme(next) });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((preference: ThemePreference) => {
    if (!isThemePreference(preference)) return;
    persistTheme(preference); // writes cookie + localStorage + applies class
    setState({ theme: preference, resolvedTheme: resolveTheme(preference) });
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const next: ThemePreference = prev.resolvedTheme === "dark" ? "light" : "dark";
      persistTheme(next);
      return { theme: next, resolvedTheme: resolveTheme(next) };
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: state.theme, resolvedTheme: state.resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

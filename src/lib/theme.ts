/**
 * SAK100 — global theme preference (light / dark / system)
 *
 * Design (mirrors the i18n cookie architecture):
 * - Persistence: `sak100_theme` cookie (1 year, samesite=lax) AND `localStorage`
 *   with the same value, kept in sync on every write. The cookie lets the SSR
 *   shell and a pre-hydration inline script apply the correct class before
 *   first paint; localStorage enables cross-tab synchronization via the
 *   `storage` event.
 * - `preference` is one of: `light`, `dark`, `system`. The *resolved* theme is
 *   `light` | `dark`, with `system` resolved via `prefers-color-scheme`.
 * - Plain module functions (callable in and out of React) + a blocking
 *   initialization snippet used by the SSR shell. No reload is required to
 *   switch themes; the ThemeProvider re-renders in place.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "sak100_theme";
export const THEME_STORAGE_KEY = "sak100_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
export const DEFAULT_THEME: ThemePreference = "system";

const SUPPORTED: readonly ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (SUPPORTED as readonly string[]).includes(value);
}

/** Resolve `system` against the OS preference. Safe to call anywhere; falls back to `light` off-browser. */
export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? resolveSystemTheme() : preference;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function readStorage(): string | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined; // storage unavailable (privacy mode) — degrade silently
  }
}

/**
 * Current stored preference (cookie wins over localStorage; both are written
 * together so they should never disagree — if they do, the cookie is the
 * source of truth because it is what SSR and the pre-paint script can see).
 * Returns `undefined` when nothing valid is stored, and `DEFAULT_THEME` is
 * applied by callers that need a concrete value.
 */
export function getStoredTheme(): ThemePreference | undefined {
  const fromCookie = readCookie(THEME_COOKIE);
  if (isThemePreference(fromCookie)) return fromCookie;
  const fromStorage = readStorage();
  if (isThemePreference(fromStorage)) return fromStorage;
  return undefined;
}

/** Current preference — defaults to `system` when nothing valid is stored. */
export function getTheme(): ThemePreference {
  return getStoredTheme() ?? DEFAULT_THEME;
}

/** Current resolved theme (never `system`). */
export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(getTheme());
}

/**
 * Apply the resolved theme to the document root. Idempotent — the same class
 * toggle is performed by the pre-paint inline script, so this never causes a
 * visual flip on hydration.
 */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Persist the preference (cookie + localStorage) and apply it immediately.
 * No reload — ThemeProvider propagates via context. Invalid input is rejected.
 */
export function setTheme(preference: ThemePreference): void {
  if (!isThemePreference(preference)) return;
  try {
    document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // cookie unavailable — localStorage still applies for this session
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // storage unavailable — cookie still applies
  }
  applyThemeToDocument(resolveTheme(preference));
}

/**
 * Serialized body of the blocking pre-paint script. Runs synchronously in
 * <head> before the first paint, outside React. Reads the cookie first
 * (mirrors SSR), then localStorage, applies `.dark`, and fails silently.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var v=m?decodeURIComponent(m[1]):null;if(!v){try{v=window.localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}}if(v!=='light'&&v!=='dark'&&v!=='system'){v='${DEFAULT_THEME}'}var d=v==='dark'||(v==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(e){}})();`;

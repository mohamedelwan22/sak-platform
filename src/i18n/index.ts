/**
 * SAK100 i18n core — Phase 11
 *
 * Design:
 * - Default language: English. Arabic fully supported.
 * - Persistence: `sak100_lang` cookie (1 year) — readable server-side so the
 *   SSR shell renders the correct lang/dir from the first paint.
 * - `t()` is a plain module function (callable at module scope, in and out of
 *   React) — switching language stores the cookie and reloads the document,
 *   so every render picks the new language without hook plumbing.
 * - Dictionaries are flat maps with dot-namespaced keys:
 *     common.*, navigation.*, auth.*, admin.*, tickets.*, broadcast.*, …
 */

export type Language = "en" | "ar";

export const DEFAULT_LANGUAGE: Language = "en";
export const LANG_COOKIE = "sak100_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const SUPPORTED: Language[] = ["en", "ar"];

export function isLanguage(value: string | undefined | null): value is Language {
  return value === "en" || value === "ar";
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Current language (cookie-based, defaults to English). */
export function getLanguage(): Language {
  const stored = readCookie(LANG_COOKIE);
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export function isRTL(): boolean {
  return getLanguage() === "ar";
}

/** Persist the language choice and hard-reload so every surface re-renders. */
export function setLanguage(language: Language): void {
  document.cookie = `${LANG_COOKIE}=${language}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
  window.location.reload();
}

// ── dictionaries ────────────────────────────────────────────────────────────

import { en } from "./locales/en";
import { ar } from "./locales/ar";

const DICTIONARIES: Record<Language, Record<string, string>> = { en, ar };

function lookup(lang: Language, key: string): string | undefined {
  const dict = DICTIONARIES[lang];
  return dict ? dict[key] : undefined;
}

/**
 * Translate a key with optional `{param}` interpolation.
 * Falls back to English, then to the key itself (never crashes the UI).
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let value = lookup(getLanguage(), key) ?? lookup("en", key) ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}

/** True when a translation exists for the key in the current language. */
export function hasTranslation(key: string): boolean {
  return lookup(getLanguage(), key) !== undefined || lookup("en", key) !== undefined;
}

// ── React integration ────────────────────────────────────────────────────────

/**
 * Hook flavour of `t` for components that prefer explicitness.
 * NOTE: with cookie+reload switching, plain `t()` is equivalent inside
 * render — this hook exists for convention and future live-switching.
 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  return t;
}

// ── API error-code translation (Phase 11.5) ──────────────────────────────────

/** Maps backend error codes to i18n keys; unknown codes fall back generically. */
const ERROR_KEY_BY_CODE: Record<string, string> = {
  VALIDATION_ERROR: "errors.validationError",
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  CONFLICT: "errors.conflict",
  TOO_MANY_REQUESTS: "errors.tooManyRequests",
  PRICE_UNAVAILABLE: "errors.priceUnavailable",
  GOLD_PRICE_UNAVAILABLE: "errors.priceUnavailable",
  INSUFFICIENT_BALANCE: "errors.insufficientBalance",
  INSUFFICIENT_INVENTORY: "errors.insufficientInventory",
  INVALID_STATUS: "errors.invalidStatus",
  INVALID_PRICE: "errors.invalidPrice",
  RBAC_ACCESS_DENIED: "errors.forbidden",
  EMAIL_NOT_VERIFIED: "errors.emailNotVerified",
  TOKEN_EXPIRED: "errors.sessionExpired",
};

/**
 * Humanize an API error: prefers the backend's stable `error.code` and
 * translates it; falls back to the raw message.
 */
export function translateApiError(error: unknown, fallbackKey = "errors.generic"): string {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string }; message?: string } };
    message?: string;
  };
  const code = err?.response?.data?.error?.code;
  if (code) {
    const mapped = ERROR_KEY_BY_CODE[code];
    if (mapped) return t(mapped);
    const snakeKey = `errors.${code.toLowerCase()}`;
    if (hasTranslation(snakeKey)) return t(snakeKey);
  }
  const message =
    err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message;
  return message || t(fallbackKey);
}

/**
 * Phone number utilities for the SAK100 frontend.
 *
 * Provides E.164 normalization, international formatting, and validation
 * using libphonenumber-js. Mirrors the backend server/src/lib/phone.ts
 * but supports all countries, not just Egypt.
 */

import { parsePhoneNumber, AsYouType } from "libphonenumber-js/max";

/**
 * Parse a phone number with a given calling code and return E.164 format.
 *
 * @param input - User-entered phone number (national or international format)
 * @param callingCode - International calling code with + prefix (e.g., "+20", "+966")
 * @returns Object with valid flag, E.164 formatted number, and reason if invalid
 */
export function normalizePhone(
  input: unknown,
  callingCode: string = "+20",
): { valid: boolean; e164: string | null; reason?: string } {
  if (input === null || input === undefined) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }

  const raw = String(input).trim();
  if (raw.length === 0) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }

  // Reject non-digit symbols except +, spaces, hyphens, parentheses
  const CLEAN_RE = /^[0-9+()\-\s]+$/;
  if (!CLEAN_RE.test(raw)) {
    return {
      valid: false,
      e164: null,
      reason: "Phone number may only contain digits, spaces, +, - and ()",
    };
  }

  try {
    const parsed = parsePhoneNumber(raw, {
      defaultCallingCode: callingCode.replace("+", ""),
    } as Parameters<typeof parsePhoneNumber>[1]);

    // Use libphonenumber-js isValid() for proper country-specific validation.
    // This validates against the country's available number formats from the
    // library's metadata, not just a digit count.
    if (parsed && parsed.isValid()) {
      return { valid: true, e164: parsed.number };
    }

    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  } catch {
    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  }
}

/**
 * Convenience predicate — returns true if the phone number is valid.
 */
export function isValidPhone(
  input: unknown,
  callingCode: string = "+20",
): boolean {
  return normalizePhone(input, callingCode).valid;
}

/**
 * Format a phone number for display as the user types.
 * Shows national format when possible, falling back to the raw input.
 */
export function formatPhoneAsYouType(
  input: string,
  callingCode: string = "+20",
): string {
  try {
    const asYouType = new AsYouType({
      defaultCallingCode: callingCode.replace(/\D/g, ""),
    });
    return asYouType.input(input);
  } catch {
    return input;
  }
}

/**
 * Format an E.164 number for display in national format.
 */
export function formatPhoneForDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed || !parsed.isValid()) return e164;
    return parsed.formatNational() as string;
  } catch {
    return e164;
  }
}

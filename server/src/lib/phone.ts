/**
 * Phone number normalisation.
 *
 * Users type numbers in their local national format ("01159279715"), but the
 * canonical stored form is E.164 ("+201159279716"). Rejecting national format
 * outright is what made admin-created investors impossible, so this module
 * ACCEPTS the common national shapes and NORMALISES them, while still refusing
 * genuinely malformed input.
 *
 * Validation is done with libphonenumber-js using the complete ("max") Google
 * metadata: the candidate number is parsed and checked with
 * `isValid()`, which verifies the number against its actual country's number
 * formats — not just a digit count. A national trunk zero is dropped before
 * the country calling code is applied; "00" is treated as the international
 * access prefix.
 */

import { parsePhoneNumber } from "libphonenumber-js/max";

/** Default country calling code. The platform's primary market is Egypt (+20). */
export const DEFAULT_CALLING_CODE = "20";

/** Digits, +, spaces, hyphens and parentheses are the only permitted symbols. */
const CLEAN_RE = /^[0-9+()\-\s]+$/;

export interface NormalizePhoneResult {
  valid: boolean;
  /** Canonical E.164 form, e.g. "+201159279716". Only set when valid. */
  e164: string | null;
  /** Human-readable explanation, suitable for a validation message. */
  reason?: string;
}

/**
 * Normalises a user-entered phone number to E.164.
 *
 * Accepted shapes:
 *   +201159279716   international / E.164
 *   00201159279716  international with 00 prefix
 *   01159279715     national with trunk zero   (default country applied)
 *   1159297915      national without trunk zero
 *
 * Spaces, hyphens and parentheses are ignored: "+20 (115) 927-9715".
 */
export function normalizePhone(
  input: unknown,
  callingCode: string = DEFAULT_CALLING_CODE,
): NormalizePhoneResult {
  if (input === null || input === undefined) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }

  const raw = String(input).trim();
  if (raw.length === 0) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }
  if (!CLEAN_RE.test(raw)) {
    return {
      valid: false,
      e164: null,
      reason: "Phone number may only contain digits, spaces, +, - and ()",
    };
  }

  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length === 0) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }

  const cc = callingCode.replace(/\D/g, "") || DEFAULT_CALLING_CODE;

  // Build the international candidate that libphonenumber-js will parse and
  // validate against its metadata.
  let candidate: string;
  if (raw.startsWith("+")) {
    candidate = `+${digitsOnly}`;
  } else if (digitsOnly.startsWith("00")) {
    // "00" is the international access prefix.
    candidate = `+${digitsOnly.slice(2)}`;
  } else {
    // National format: drop any trunk zero, then apply the default country code.
    // "01159279715" -> "1159297915" -> "+20" + "1159297915"
    const national = digitsOnly.replace(/^0+/, "");
    if (national.length === 0) {
      return { valid: false, e164: null, reason: "Phone number is required" };
    }
    candidate = `+${cc}${national}`;
  }

  try {
    const parsed = parsePhoneNumber(candidate);
    // Country-specific validation using the complete Google metadata.
    if (parsed && parsed.isValid()) {
      return { valid: true, e164: parsed.number };
    }
    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  } catch {
    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  }
}

/** Convenience predicate. */
export function isValidPhone(input: unknown, callingCode: string = DEFAULT_CALLING_CODE): boolean {
  return normalizePhone(input, callingCode).valid;
}

/**
 * Zod-compatible schema value: returns the canonical E.164 string so downstream
 * persistence always stores one representation.
 */
export function toE164OrOriginal(
  input: string,
  callingCode: string = DEFAULT_CALLING_CODE,
): string {
  const result = normalizePhone(input, callingCode);
  return result.valid && result.e164 ? result.e164 : input;
}

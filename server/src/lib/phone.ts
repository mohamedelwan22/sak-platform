/**
 * Phone number normalisation.
 *
 * Users type numbers in their local national format ("01159279715"), but the
 * canonical stored form is E.164 ("+201159279716"). Rejecting national format
 * outright is what made admin-created investors impossible, so this module
 * ACCEPTS the common national shapes and NORMALISES them, while still refusing
 * genuinely malformed input.
 *
 * Validation is deliberately preserved: letters, empty strings, and digit counts
 * outside the E.164 range are all rejected.
 */

/** Default country calling code. The platform's primary market is Egypt (+20). */
export const DEFAULT_CALLING_CODE = "20";

/** Digits permitted anywhere in the input. Everything else is rejected. */
const CLEAN_RE = /^[0-9+()\-\s]+$/;

/**
 * E.164 allows at most 15 digits and at least 8 is the practical floor for a
 * dialable subscriber number.
 */
const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

/** A national trunk number of 7–12 digits is the range real operators use. */
const MIN_NATIONAL_DIGITS = 7;
const MAX_NATIONAL_DIGITS = 12;

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
    return { valid: false, e164: null, reason: "Phone number may only contain digits, spaces, +, - and ()" };
  }

  // Strip everything that is not a digit, remembering whether a "+" was present.
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (digits.length === 0) {
    return { valid: false, e164: null, reason: "Phone number is required" };
  }

  const cc = callingCode.replace(/\D/g, "");

  if (hasPlus) {
    // Already international — keep verbatim.
    if (!isValidE164(digits)) {
      return { valid: false, e164: null, reason: "Phone number format is invalid" };
    }
    return { valid: true, e164: `+${digits}` };
  }

  if (digits.startsWith("00")) {
    // 00 is the international access code.
    digits = digits.slice(2);
    if (!isValidE164(digits)) {
      return { valid: false, e164: null, reason: "Phone number format is invalid" };
    }
    return { valid: true, e164: `+${digits}` };
  }

  // National format: drop the trunk zero, then apply the default country code.
  // "01159279715" -> "1159297915" -> "+20" + "1159297915"
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  if (digits.length < MIN_NATIONAL_DIGITS || digits.length > MAX_NATIONAL_DIGITS) {
    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  }

  const full = `${cc}${digits}`;
  if (!isValidE164(full)) {
    return { valid: false, e164: null, reason: "Phone number format is invalid" };
  }

  return { valid: true, e164: `+${full}` };
}

function isValidE164(digits: string): boolean {
  // E.164 country codes never begin with 0.
  if (digits.startsWith("0")) return false;
  return digits.length >= MIN_E164_DIGITS && digits.length <= MAX_E164_DIGITS;
}

/** Convenience predicate. */
export function isValidPhone(input: unknown, callingCode: string = DEFAULT_CALLING_CODE): boolean {
  return normalizePhone(input, callingCode).valid;
}

/**
 * Zod-compatible schema value: returns the canonical E.164 string so downstream
 * persistence always stores one representation.
 */
export function toE164OrOriginal(input: string, callingCode: string = DEFAULT_CALLING_CODE): string {
  const result = normalizePhone(input, callingCode);
  return result.valid && result.e164 ? result.e164 : input;
}

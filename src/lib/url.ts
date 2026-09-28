/**
 * Safe external-URL validation for the frontend.
 *
 * Mirrors the server rule (broadcast validators + assertSafeHttpUrl): only
 * http: and https: are acceptable. Anything else — javascript:, data:,
 * vbscript:, file: — is refused so a stored announcement can never execute
 * script when its CTA is activated.
 */
export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // A relative path is never a valid external CTA target.
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    // Require a real host, not "https://" with nothing after it.
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

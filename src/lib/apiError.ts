/**
 * Turns an API failure into a message a user can act on.
 *
 * The backend's validation envelope is:
 *   { error: { code, message, details?: { field: [msg, ...] } } }
 *
 * Reporting only `error.message` produces a useless "Validation failed" with no
 * indication of WHICH field was rejected, so field-level detail is flattened into
 * the message here.
 */

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

function formatDetails(details: unknown): string | null {
  if (!details) return null;

  // zod-style: { field: ["message"] } or { field: "message" }
  if (typeof details === "object" && !Array.isArray(details)) {
    const parts: string[] = [];
    for (const [field, value] of Object.entries(details as Record<string, unknown>)) {
      const label = field
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .trim();
      const messages = Array.isArray(value) ? value.map(String) : [String(value)];
      parts.push(`${label}: ${messages.join(", ")}`);
    }
    if (parts.length) return parts.join(" · ");
  }

  if (Array.isArray(details)) {
    const parts = details.map((d) =>
      typeof d === "object" && d !== null && "message" in d
        ? String((d as { message: unknown }).message)
        : String(d),
    );
    if (parts.length) return parts.join(" · ");
  }

  return null;
}

export function extractErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error && typeof error === "object" && "response" in error) {
    const body = (error as { response?: { data?: ApiErrorBody } }).response?.data;

    if (body?.error?.message) {
      const detail = formatDetails(body.error.details);
      // Avoid "Validation failed: Validation failed" style repetition.
      const base = body.error.message;
      if (detail && !base.toLowerCase().includes(detail.toLowerCase())) {
        return `${base} — ${detail}`;
      }
      return detail ?? base;
    }

    if (body?.message) return String(body.message);
  }

  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/**
 * Phase 09 — Investor Support constants.
 * Single source of truth for ticket categories, statuses, priorities,
 * the status transition machine, and attachment limits. The frontend
 * mirrors these via i18n keys (ticketCategory.*, status.ticket_*, priority.*).
 */

export const SUPPORT_CATEGORIES = [
  "general",
  "account",
  "kyc",
  "investment",
  "payment",
  "withdrawal",
  "gold",
  "project",
  "technical",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = [
  "open",
  "in_progress",
  "waiting_for_investor",
  "resolved",
  "closed",
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

/**
 * Status transition machine. Empty allowed-transitions means terminal.
 * `waiting_for_investor` is staff-initiated only; `open` after
 * resolved/closed is a "reopen".
 */
export const SUPPORT_STATUS_TRANSITIONS: Record<SupportStatus, readonly SupportStatus[]> = {
  open: ["in_progress", "waiting_for_investor", "resolved", "closed"],
  in_progress: ["waiting_for_investor", "resolved", "closed", "open"],
  waiting_for_investor: ["in_progress", "resolved", "closed", "open"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

/** Statuses the ticket OWNER (investor) may set on their own ticket. */
export const OWNER_ALLOWED_TRANSITIONS: Record<SupportStatus, readonly SupportStatus[]> = {
  open: ["closed"],
  in_progress: ["closed"],
  waiting_for_investor: ["closed", "open"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

export const TICKET_ATTACHMENT_MAX_FILES = 5;
export const TICKET_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024; // 15MB
export const TICKET_STORAGE_BUCKET = "support-attachments";

export const TICKET_ATTACHMENT_MIME: ReadonlySet<string> = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** Rate limits against ticket spam / message flooding. */
export const TICKET_CREATE_WINDOW_MS = 10 * 60 * 1000;
export const TICKET_CREATE_MAX = 5;
export const TICKET_REPLY_WINDOW_MS = 10 * 60 * 1000;
export const TICKET_REPLY_MAX = 20;

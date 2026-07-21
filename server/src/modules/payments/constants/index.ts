export const PAYMENT_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const PAYMENT_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
} as const;

export const PAYMENT_SORTABLE_FIELDS = [
  "type",
  "amount",
  "currency",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const PAYMENT_SEARCH_FIELDS = ["type", "currency", "status"] as const;

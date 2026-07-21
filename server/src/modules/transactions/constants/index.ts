export const TRANSACTION_SORTABLE_FIELDS = [
  "amount",
  "type",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const TRANSACTION_SEARCH_FIELDS = ["description", "rejectionReason"] as const;

export const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
  "adjustment",
] as const;

export const TRANSACTION_STATUSES = ["pending", "approved", "rejected", "completed"] as const;

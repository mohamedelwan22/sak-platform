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
  "profit_distribution",
] as const;

export const TRANSACTION_STATUSES = ["pending", "approved", "rejected", "completed"] as const;

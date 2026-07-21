export const NOTIFICATION_SORTABLE_FIELDS = [
  "title",
  "message",
  "type",
  "isRead",
  "createdAt",
  "updatedAt",
] as const;

export const NOTIFICATION_SEARCH_FIELDS = ["title", "message"] as const;

export const NOTIFICATION_TYPES = ["system", "transaction", "kyc", "investment", "wallet"] as const;

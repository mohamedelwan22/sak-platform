export const WALLET_SORTABLE_FIELDS = [
  "balance",
  "frozenBalance",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const WALLET_SEARCH_FIELDS = ["user.firstName", "user.lastName", "user.email"] as const;

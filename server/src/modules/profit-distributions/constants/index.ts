export const PROFIT_DISTRIBUTION_SORTABLE_FIELDS = [
  "totalProfitUsd",
  "periodStart",
  "periodEnd",
  "distributedAt",
  "createdAt",
] as const;

export const PROFIT_DISTRIBUTION_SEARCH_FIELDS = [] as const;

export const PROFIT_PAYOUT_SORTABLE_FIELDS = [
  "ownershipPercent",
  "payoutUsd",
  "payoutSak",
  "status",
  "createdAt",
] as const;

export const PROFIT_PAYOUT_SEARCH_FIELDS = ["status"] as const;

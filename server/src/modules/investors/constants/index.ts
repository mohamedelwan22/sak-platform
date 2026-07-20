export const INVESTOR_ROLE_NAME = "investor" as const;

export const INVESTOR_SORTABLE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const INVESTOR_SEARCH_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

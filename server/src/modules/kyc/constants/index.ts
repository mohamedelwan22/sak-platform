export const KYC_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const KYC_DOCUMENT_TYPES = {
  NATIONAL_ID: "national_id",
  PASSPORT: "passport",
  DRIVER_LICENSE: "driver_license",
} as const;

export const KYC_SORTABLE_FIELDS = ["documentType", "status", "createdAt", "updatedAt"] as const;

export const KYC_SEARCH_FIELDS = ["documentType", "status"] as const;

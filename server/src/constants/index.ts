export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  INVESTOR: "investor",
} as const;

export const TRANSACTION_TYPES = {
  PURCHASE: "purchase",
  SALE: "sale",
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  FEE: "fee",
  PROFIT_DISTRIBUTION: "profit_distribution",
} as const;

export const KYC_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const LAND_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PARTIALLY_SOLD: "partially_sold",
  SOLD_OUT: "sold_out",
  CLOSED: "closed",
} as const;

export const MARKETPLACE_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  SOLD: "sold",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

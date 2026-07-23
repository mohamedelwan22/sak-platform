export const AuditActions = {
  // Auth
  AUTH_REGISTER: "auth.register",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_LOGOUT_ALL: "auth.logout_all",
  AUTH_REFRESH_TOKEN: "auth.refresh_token",
  AUTH_TOKEN_REUSE: "auth.token_reuse",

  // Password
  PASSWORD_FORGOT_REQUESTED: "password.forgot_requested",
  PASSWORD_RESET_COMPLETED: "password.reset_completed",
  PASSWORD_CHANGED: "password.changed",

  // Email
  EMAIL_VERIFICATION_SENT: "email.verification_sent",
  EMAIL_VERIFIED: "email.verified",

  // Sessions
  SESSION_CREATED: "session.created",
  SESSION_DELETED: "session.deleted",

  // Users
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_LOCKED: "user.locked",
  USER_UNLOCKED: "user.unlocked",

  // Roles
  ROLE_PERMISSIONS_UPDATED: "role.permissions_updated",

  // Permissions
  PERMISSION_CREATED: "permission.created",
  PERMISSION_UPDATED: "permission.updated",
  PERMISSION_DELETED: "permission.deleted",

  // RBAC
  RBAC_ACCESS_DENIED: "rbac.access_denied",

  // Countries
  COUNTRY_CREATED: "country.created",
  COUNTRY_UPDATED: "country.updated",
  COUNTRY_DELETED: "country.deleted",

  // Cities
  CITY_CREATED: "city.created",
  CITY_UPDATED: "city.updated",
  CITY_DELETED: "city.deleted",

  // Investors
  INVESTOR_CREATED: "investor.created",
  INVESTOR_UPDATED: "investor.updated",
  INVESTOR_DELETED: "investor.deleted",
  INVESTOR_RESTORED: "investor.restored",

  // KYC
  KYC_SUBMITTED: "kyc.submitted",
  KYC_APPROVED: "kyc.approved",
  KYC_REJECTED: "kyc.rejected",

  // Payments
  PAYMENT_CREATED: "payment.created",
  PAYMENT_APPROVED: "payment.approved",
  PAYMENT_REJECTED: "payment.rejected",

  // Wallets
  WALLET_CREATED: "wallet.created",
  WALLET_UPDATED: "wallet.updated",
  WALLET_DELETED: "wallet.deleted",
  WALLET_RESTORED: "wallet.restored",

  // Transactions
  TRANSACTION_CREATED: "transaction.created",
  TRANSACTION_APPROVED: "transaction.approved",
  TRANSACTION_REJECTED: "transaction.rejected",
  TRANSACTION_DELETED: "transaction.deleted",

  // Notifications
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_DELETED: "notification.deleted",

  // Projects
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",

  // Lands (admin)
  LAND_CREATED: "land.created",
  LAND_UPDATED: "land.updated",
  LAND_DELETED: "land.deleted",

  // Gold Prices
  GOLD_PRICE_CREATED: "gold_price.created",
  GOLD_PRICE_UPDATED: "gold_price.updated",
  GOLD_PRICE_DELETED: "gold_price.deleted",

  // SAK Config
  SAK_CONFIG_CREATED: "sak_config.created",
  SAK_CONFIG_UPDATED: "sak_config.updated",
  SAK_CONFIG_DELETED: "sak_config.deleted",

  // Holdings / Buy SAK
  HOLDING_CREATED: "holding.created",
  HOLDING_UPDATED: "holding.updated",
  HOLDING_DELETED: "holding.deleted",

  // Buy SAK
  BUY_SAK_COMPLETED: "buy_sak.completed",
  BUY_SAK_FAILED: "buy_sak.failed",

  // System
  SYSTEM_AUDIT_VIEWED: "system.audit_viewed",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export const AUDIT_SEARCH_FIELDS = ["action", "actorEmail", "entityType"] as const;

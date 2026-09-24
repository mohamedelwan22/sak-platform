export const AuditActions = {
  // Auth
  AUTH_REGISTER: "auth.register",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_LOGOUT_ALL: "auth.logout_all",
  AUTH_REFRESH_TOKEN: "auth.refresh_token",
  AUTH_TOKEN_REUSE: "auth.token_reuse",
  AUTH_GOOGLE_LOGIN: "auth.google_login",
  AUTH_GOOGLE_REGISTER: "auth.google_register",
  AUTH_GOOGLE_FAILED: "auth.google_failed",

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

  // Gold market provider (Phase 07)
  GOLD_PROVIDER_REFRESHED: "gold_price.provider_refreshed",
  GOLD_REFRESH_FAILED: "gold_price.refresh_failed",
  GOLD_FALLBACK_ACTIVATED: "gold_price.fallback_activated",
  GOLD_MANUAL_OVERRIDE: "gold_price.manual_override",

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

  // Brokers
  BROKER_PROFILE_CREATED: "broker.profile_created",
  BROKER_PROFILE_UPDATED: "broker.profile_updated",
  BROKER_VERIFIED: "broker.verified",
  BROKER_REJECTED: "broker.rejected",
  BROKER_DEACTIVATED: "broker.deactivated",
  BROKER_ACTIVATED: "broker.activated",

  // Leads
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  LEAD_ASSIGNED: "lead.assigned",
  LEAD_STATUS_CHANGED: "lead.status_changed",

  // Viewings / Bookings
  VIEWING_CREATED: "viewing.created",
  VIEWING_UPDATED: "viewing.updated",
  BOOKING_CREATED: "booking.created",
  BOOKING_UPDATED: "booking.updated",
  BOOKING_CONVERTED: "booking.converted",

  // Investment Requests (Task 6 lifecycle)
  INVESTMENT_REQUEST_CREATED: "investment.request.created",
  INVESTMENT_PAYMENT_PROOF_UPLOADED: "investment.payment.proof_uploaded",
  INVESTMENT_PAYMENT_CONFIRMED: "investment.payment.confirmed",
  INVESTMENT_PAYMENT_REJECTED: "investment.payment.rejected",
  INVESTMENT_REQUEST_APPROVED: "investment.request.approved",
  INVESTMENT_REQUEST_REJECTED: "investment.request.rejected",
  INVESTMENT_REQUEST_UNDER_REVIEW: "investment.request.under_review",
  INVESTMENT_EXECUTED: "investment.executed",
  INVESTMENT_CANCELLED: "investment.cancelled",
  INVESTMENT_FAILED: "investment.failed",

  // Commissions
  COMMISSION_CREATED: "commission.created",
  COMMISSION_APPROVED: "commission.approved",
  COMMISSION_REJECTED: "commission.rejected",
  COMMISSION_PAID: "commission.paid",
  COMMISSION_RATE_CHANGED: "commission.rate_changed",

  // Attribution
  ATTRIBUTION_CORRECTED: "attribution.corrected",

  // Affiliate / Referral
  REFERRAL_LINK_VIEWED: "referral.link_viewed",
  REFERRAL_WITHDRAWAL_REQUESTED: "referral.withdrawal_requested",

  // Customers
  CUSTOMER_STATUS_UPDATED: "customer.status_updated",

  // CMS / Assets
  ASSET_TYPE_CREATED: "asset_type.created",
  ASSET_TYPE_UPDATED: "asset_type.updated",
  ASSET_FIELD_CREATED: "asset_field.created",
  CMS_HOMEPAGE_UPDATED: "cms.homepage_updated",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export const AUDIT_SEARCH_FIELDS = ["action", "actorEmail", "entityType"] as const;

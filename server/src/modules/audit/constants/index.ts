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

  // System
  SYSTEM_AUDIT_VIEWED: "system.audit_viewed",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export const AUDIT_SEARCH_FIELDS = ["action", "actorEmail", "entityType"] as const;

/**
 * Impersonation context. Present ONLY on access tokens minted by the admin
 * impersonation flow. `userId`/`email`/`role` on such a token always describe the
 * TARGET user, so server-side RBAC evaluates the target's real authority and can
 * never be escalated by impersonating a more privileged account.
 */
export interface ImpersonationContext {
  sessionId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  imp?: ImpersonationContext;
}

export interface AuthenticatedUser {
  /** Effective (target) user id while impersonating, otherwise the caller's own id. */
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  /** Original administrator identity. Set only while impersonating. */
  actor?: ImpersonationContext;
}

export function isImpersonating(user: AuthenticatedUser | undefined): boolean {
  return Boolean(user?.actor);
}

export interface AuthUserSummary extends AuthenticatedUser {
  accountNumber: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  platform?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
  accountType?: "investor" | "broker";
}

export interface GoogleSignInInput {
  credential: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
}

export interface ChangePasswordInput {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendVerificationInput {
  email: string;
}

export interface RefreshTokenInput {
  refreshToken?: string;
}

export interface LogoutInput {
  refreshToken?: string;
}

export interface TokenUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tokenVersion: number;
  status: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
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
}

export interface LoginInput {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
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

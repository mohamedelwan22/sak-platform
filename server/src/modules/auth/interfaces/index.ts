import type { DeviceInfo } from "../types/index.js";

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
    isLocked: boolean;
    lockedUntil: Date | null;
    failedAttempts: number;
  } | null>;

  findUserById(id: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
  } | null>;

  createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    roleId: string;
    status?: string;
    emailVerified?: boolean;
    phone?: string | null;
  }): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
  }>;

  getDefaultRoleId(): Promise<string>;

  updateLastLogin(userId: string): Promise<void>;

  incrementFailedAttempts(userId: string): Promise<number>;

  resetFailedAttempts(userId: string): Promise<void>;

  lockUser(userId: string, durationMs: number): Promise<void>;

  findSessionByTokenHash(tokenHash: string): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    deviceName: string | null;
    browser: string | null;
    operatingSystem: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: { name: string };
      tokenVersion: number;
      status: string;
    };
  } | null>;

  createSession(data: {
    userId: string;
    tokenHash: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }>;

  updateSessionLastUsed(sessionId: string): Promise<void>;

  deleteSession(sessionId: string): Promise<void>;

  revokeSession(sessionId: string): Promise<void>;

  deleteAllUserSessions(userId: string): Promise<number>;

  revokeAllUserSessions(userId: string): Promise<number>;

  findUserSessions(userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      browser: string | null;
      operatingSystem: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastUsedAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
    }>
  >;

  isEmailTaken(email: string): Promise<boolean>;

  findUserPermissions(userId: string): Promise<Array<{ name: string; resource: string }>>;
}

import type { DeviceInfo } from "../types/index.js";

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    accountNumber: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
    emailVerified: boolean;
    isLocked: boolean;
    lockedUntil: Date | null;
    failedAttempts: number;
  } | null>;

  findUserByIdentity(identifier: string): Promise<{
    id: string;
    email: string;
    accountNumber: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
    emailVerified: boolean;
    isLocked: boolean;
    lockedUntil: Date | null;
    failedAttempts: number;
  } | null>;

  findUserById(id: string): Promise<{
    id: string;
    email: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
    emailVerified: boolean;
  } | null>;

  findUserByIdWithPassword(id: string): Promise<{
    id: string;
    email: string;
    accountNumber: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    status: string;
    emailVerified: boolean;
  } | null>;

  createUser(data: {
    email: string;
    accountNumber: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    roleId: string;
    status?: string;
    emailVerified?: boolean;
    phone?: string | null;
  }): Promise<{
    id: string;
    email: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    role: { name: string };
    tokenVersion: number;
    emailVerified: boolean;
  }>;

  findIdentityByProvider(
    provider: string,
    providerAccountId: string,
  ): Promise<{
    id: string;
    user: {
      id: string;
      email: string;
      accountNumber: string;
      passwordHash: string | null;
      firstName: string;
      lastName: string;
      role: { name: string };
      tokenVersion: number;
      status: string;
      emailVerified: boolean;
      isLocked: boolean;
      lockedUntil: Date | null;
      failedAttempts: number;
    };
  } | null>;

  findIdentityByUserIdAndProvider(
    userId: string,
    provider: string,
  ): Promise<{ id: string; providerAccountId: string } | null>;

  createIdentity(data: {
    provider: string;
    providerAccountId: string;
    userId: string;
  }): Promise<{ id: string }>;

  getDefaultRoleId(): Promise<string>;

  updateLastLogin(userId: string): Promise<void>;

  incrementFailedAttempts(userId: string): Promise<number>;

  resetFailedAttempts(userId: string): Promise<void>;

  lockUser(userId: string, durationMs: number): Promise<void>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;

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

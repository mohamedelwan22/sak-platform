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

  findRefreshToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    deviceInfo: unknown;
    expiresAt: Date;
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

  createRefreshToken(data: {
    userId: string;
    token: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
  }): Promise<{ id: string; token: string; expiresAt: Date }>;

  deleteRefreshToken(token: string): Promise<void>;

  deleteAllRefreshTokens(userId: string): Promise<number>;

  isEmailTaken(email: string): Promise<boolean>;
}

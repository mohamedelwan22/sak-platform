import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IAuthRepository } from "../interfaces/index.js";
import type { DeviceInfo } from "../types/index.js";

export class AuthRepository implements IAuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        tokenVersion: true,
        status: true,
        isLocked: true,
        lockedUntil: true,
        failedAttempts: true,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        tokenVersion: true,
        status: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    roleId: string;
    status?: string;
    emailVerified?: boolean;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: data.roleId,
        status: (data.status as "active" | "inactive" | "suspended" | "pending") ?? "pending",
        emailVerified: data.emailVerified ?? false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        tokenVersion: true,
      },
    });
  }

  async getDefaultRoleId(): Promise<string> {
    const role = await prisma.role.findUnique({ where: { name: "investor" } });
    if (!role) throw new Error("Default role 'investor' not found");
    return role.id;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async incrementFailedAttempts(userId: string): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });
    return user.failedAttempts;
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, isLocked: false, lockedUntil: null },
    });
  }

  async lockUser(userId: string, durationMs: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: true,
        lockedUntil: new Date(Date.now() + durationMs),
      },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
            tokenVersion: true,
            status: true,
          },
        },
      },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    token: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        deviceInfo: data.deviceInfo as Prisma.InputJsonValue,
        expiresAt: data.expiresAt,
      },
      select: { id: true, token: true, expiresAt: true },
    });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  async deleteAllRefreshTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({ where: { userId } });
    return result.count;
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }
}

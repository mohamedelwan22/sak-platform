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
    phone?: string | null;
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
        phone: data.phone ?? null,
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

  async findSessionByTokenHash(tokenHash: string) {
    return prisma.session.findUnique({
      where: { tokenHash },
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

  async createSession(data: {
    userId: string;
    tokenHash: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
  }) {
    return prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        deviceName: data.deviceInfo.deviceName ?? null,
        browser: data.deviceInfo.browser ?? null,
        operatingSystem: data.deviceInfo.operatingSystem ?? null,
        ipAddress: data.deviceInfo.ip ?? null,
        userAgent: data.deviceInfo.userAgent ?? null,
        expiresAt: data.expiresAt,
      },
      select: { id: true, expiresAt: true },
    });
  }

  async updateSessionLastUsed(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({ where: { id: sessionId } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async deleteAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.deleteMany({ where: { userId } });
    return result.count;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async findUserSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        tokenHash: true,
        deviceName: true,
        browser: true,
        operatingSystem: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }
}

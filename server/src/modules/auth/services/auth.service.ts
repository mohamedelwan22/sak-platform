import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "../../../lib/errors.js";
import { getEnv } from "../../../config/env.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  parseDeviceInfo,
} from "../utils/index.js";
import type {
  RegisterInput,
  LoginInput,
  DeviceInfo,
  AuthTokens,
  SessionInfo,
} from "../types/index.js";
import type { AuthResponseDTO, UserResponseDTO } from "../dto/index.js";
import type { Request } from "express";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(input: RegisterInput, req: Request): Promise<AuthResponseDTO> {
    const existingUser = await this.authRepository.isEmailTaken(input.email);
    if (existingUser) {
      throw new ConflictError("An account with this email already exists");
    }

    const env = getEnv();
    const requireVerification = env.AUTH_REQUIRE_EMAIL_VERIFICATION;

    const passwordHash = await hashPassword(input.password);
    const roleId = await this.authRepository.getDefaultRoleId();

    const user = await this.authRepository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId,
      status: requireVerification ? "pending" : "active",
      emailVerified: !requireVerification,
      phone: input.phone ?? null,
    });

    const deviceInfo = parseDeviceInfo(req);
    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role.name,
        tokenVersion: user.tokenVersion,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput, deviceInfo: DeviceInfo): Promise<AuthResponseDTO> {
    const user = await this.authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedError("Account is temporarily locked. Please try again later");
      }
      await this.authRepository.resetFailedAttempts(user.id);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const attempts = await this.authRepository.incrementFailedAttempts(user.id);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await this.authRepository.lockUser(user.id, LOCK_DURATION_MS);
        throw new UnauthorizedError(
          "Account is temporarily locked due to too many failed attempts",
        );
      }
      throw new UnauthorizedError("Invalid email or password");
    }

    await this.authRepository.resetFailedAttempts(user.id);
    await this.authRepository.updateLastLogin(user.id);

    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role.name,
        tokenVersion: user.tokenVersion,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshTokenValue: string | undefined, req: Request): Promise<AuthTokens> {
    const token = this.extractRefreshToken(refreshTokenValue, req);
    if (!token) {
      throw new UnauthorizedError("Refresh token is required");
    }

    const tokenHash = hashRefreshToken(token);
    const session = await this.authRepository.findSessionByTokenHash(tokenHash);

    if (!session) {
      await this.handleTokenReuse(token);
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.expiresAt < new Date()) {
      await this.authRepository.deleteSession(session.id);
      throw new UnauthorizedError("Refresh token has expired");
    }

    if (session.revokedAt) {
      await this.authRepository.revokeAllUserSessions(session.userId);
      throw new UnauthorizedError("Refresh token has been revoked. All sessions terminated.");
    }

    if (session.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    await this.authRepository.deleteSession(session.id);

    const deviceInfo = parseDeviceInfo(req);
    const newTokens = await this.createSession(session.userId, deviceInfo);

    return newTokens;
  }

  async logout(refreshTokenValue: string | undefined, req: Request): Promise<void> {
    const token = this.extractRefreshToken(refreshTokenValue, req);
    if (!token) {
      return;
    }

    const tokenHash = hashRefreshToken(token);
    const session = await this.authRepository.findSessionByTokenHash(tokenHash);
    if (session) {
      await this.authRepository.deleteSession(session.id);
    }
  }

  async logoutAll(userId: string): Promise<{ deletedCount: number }> {
    const deletedCount = await this.authRepository.revokeAllUserSessions(userId);
    return { deletedCount };
  }

  async me(userId: string): Promise<UserResponseDTO> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      status: user.status,
    };
  }

  async getSessions(userId: string, currentTokenHash: string | undefined): Promise<SessionInfo[]> {
    const sessions = await this.authRepository.findUserSessions(userId);

    const now = new Date();
    return sessions
      .filter((s) => s.expiresAt > now)
      .map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        browser: s.browser,
        operatingSystem: s.operatingSystem,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
      }));
  }

  async deleteSession(
    userId: string,
    sessionId: string,
    currentTokenHash: string | undefined,
  ): Promise<void> {
    const sessions = await this.authRepository.findUserSessions(userId);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    if (currentTokenHash && session.tokenHash === currentTokenHash) {
      throw new ForbiddenError("Cannot delete current session. Use logout instead.");
    }

    await this.authRepository.deleteSession(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      return result.count;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async createSession(userId: string, deviceInfo: DeviceInfo): Promise<AuthTokens> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenValue = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshTokenValue);
    const expiresAt = getRefreshTokenExpiry();

    await this.authRepository.createSession({
      userId: user.id,
      tokenHash,
      deviceInfo,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: "15m",
    };
  }

  private extractRefreshToken(bodyToken: string | undefined, req: Request): string | undefined {
    if (bodyToken) return bodyToken;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    const cookieRefreshToken = (req as unknown as Record<string, unknown>).cookies as
      Record<string, string> | undefined;
    if (cookieRefreshToken?.refreshToken) {
      return cookieRefreshToken.refreshToken;
    }

    return undefined;
  }

  private async handleTokenReuse(token: string): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    const compromisedSession = await this.authRepository.findSessionByTokenHash(tokenHash);

    if (compromisedSession) {
      await this.authRepository.revokeAllUserSessions(compromisedSession.userId);
    }
  }
}

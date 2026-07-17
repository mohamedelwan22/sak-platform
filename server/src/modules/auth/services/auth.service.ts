import { ConflictError, UnauthorizedError, NotFoundError } from "../../../lib/errors.js";
import { getEnv } from "../../../config/env.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  parseDeviceInfo,
} from "../utils/index.js";
import type { RegisterInput, LoginInput, DeviceInfo, AuthTokens } from "../types/index.js";
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
    const tokens = await this.generateAndStoreTokens(user.id, deviceInfo);

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

    const tokens = await this.generateAndStoreTokens(user.id, deviceInfo);

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

    const storedToken = await this.authRepository.findRefreshToken(token);
    if (!storedToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (storedToken.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshToken(token);
      throw new UnauthorizedError("Refresh token has expired");
    }

    if (storedToken.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    await this.authRepository.deleteRefreshToken(token);

    const deviceInfo = parseDeviceInfo(req);
    const newTokens = await this.generateAndStoreTokens(storedToken.userId, deviceInfo);

    return newTokens;
  }

  async logout(refreshTokenValue: string | undefined, req: Request): Promise<void> {
    const token = this.extractRefreshToken(refreshTokenValue, req);
    if (!token) {
      return;
    }

    await this.authRepository.deleteRefreshToken(token);
  }

  async logoutAll(userId: string): Promise<{ deletedCount: number }> {
    const deletedCount = await this.authRepository.deleteAllRefreshTokens(userId);
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

  private async generateAndStoreTokens(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<AuthTokens> {
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
    const expiresAt = getRefreshTokenExpiry();

    await this.authRepository.createRefreshToken({
      userId: user.id,
      token: refreshTokenValue,
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
}

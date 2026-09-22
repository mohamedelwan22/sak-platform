import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  EmailNotVerifiedError,
} from "../../../lib/errors.js";
import { getEnv } from "../../../config/env.js";
import { getEmailProvider } from "../../../services/email/index.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import { EmailVerificationRepository } from "../repositories/email-verification.repository.js";
import { VerificationService } from "./verification.service.js";
import { AccountNumberService } from "./account-number.service.js";
import { GoogleOidcService, type GoogleAccountPayload } from "./google-oidc.service.js";
import { Prisma } from "@prisma/client";
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
  GoogleSignInInput,
  DeviceInfo,
  AuthTokens,
  SessionInfo,
} from "../types/index.js";
import type { AuthResponseDTO, RegisterResponseDTO, UserResponseDTO } from "../dto/index.js";
import type { Request } from "express";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const GOOGLE_PROVIDER = "google";

const NAME_MAX_LENGTH = 100;

type GoogleAuthenticatedUser = {
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

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function normalizeGoogleEmail(email: string | null | undefined): string {
  if (!email) return "";
  let normalized = email.trim().toLowerCase();
  if (normalized.endsWith("@googlemail.com")) {
    normalized = `${normalized.slice(0, -"@googlemail.com".length)}@gmail.com`;
  }
  return normalized;
}

function toGoogleName(payload: GoogleAccountPayload): { firstName: string; lastName: string } {
  const givenName = payload.givenName?.trim();
  const familyName = payload.familyName?.trim();
  const fullName = payload.name?.trim();

  let firstName = givenName ?? "";
  let lastName = familyName ?? "";

  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] ?? "";
    if (parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  return {
    firstName: (firstName || "Google").slice(0, NAME_MAX_LENGTH),
    lastName: (lastName || "User").slice(0, NAME_MAX_LENGTH),
  };
}

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly accountNumberService: AccountNumberService = new AccountNumberService(),
    private readonly verificationService: VerificationService = new VerificationService(
      new EmailVerificationRepository(),
      getEmailProvider(),
    ),
    private readonly googleOidcService: GoogleOidcService = new GoogleOidcService({
      clientId: getEnv().GOOGLE_CLIENT_ID ?? "",
      clientSecret: getEnv().GOOGLE_CLIENT_SECRET ?? "",
    }),
  ) {}

  async register(input: RegisterInput, req: Request): Promise<RegisterResponseDTO> {
    const existingUser = await this.authRepository.isEmailTaken(input.email);
    if (existingUser) {
      throw new ConflictError("An account with this email already exists");
    }

    const env = getEnv();
    const requireVerification = env.AUTH_REQUIRE_EMAIL_VERIFICATION;

    const passwordHash = await hashPassword(input.password);
    const roleId = await this.authRepository.getDefaultRoleId();
    const accountNumber = await this.accountNumberService.generateNext();

    const user = await this.authRepository.createUser({
      email: input.email,
      accountNumber,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId,
      status: requireVerification ? "pending" : "active",
      emailVerified: !requireVerification,
      phone: input.phone ?? null,
    });

    if ((input.accountType ?? "investor") === "broker") {
      await this.authRepository.createBrokerProfile(user.id, {
        displayName: `${input.firstName} ${input.lastName}`.trim(),
        phone: input.phone ?? null,
      });
    }

    if (requireVerification) {
      await this.verificationService.issue(user.email);

      return {
        requiresVerification: true,
        user: {
          userId: user.id,
          email: user.email,
          role: user.role.name,
          accountNumber: user.accountNumber,
          emailVerified: false,
        },
      };
    }

    const deviceInfo = parseDeviceInfo(req);
    return this.createSession(user.id, deviceInfo);
  }

  async login(input: LoginInput, deviceInfo: DeviceInfo): Promise<AuthResponseDTO> {
    const user = await this.authRepository.findUserByIdentity(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status !== "active" && user.status !== "pending") {
      throw new UnauthorizedError("Account is not active");
    }

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedError("Account is temporarily locked. Please try again later");
      }
      await this.authRepository.resetFailedAttempts(user.id);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password");
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

    if (getEnv().AUTH_REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    return this.createSession(user.id, deviceInfo);
  }

  async verifyEmail(email: string, code: string, req: Request): Promise<AuthResponseDTO> {
    const verified = await this.verificationService.verify(email, code);
    const deviceInfo = parseDeviceInfo(req);
    return this.createSession(verified.userId, deviceInfo);
  }

  async resendVerification(email: string): Promise<void> {
    await this.verificationService.issue(email);
  }

  async googleAuthenticate(input: GoogleSignInInput, req: Request): Promise<RegisterResponseDTO> {
    const payload = await this.googleOidcService.verifyCredential(input.credential);
    const deviceInfo = parseDeviceInfo(req);
    const email = normalizeGoogleEmail(payload.email);

    const identity = await this.authRepository.findIdentityByProvider(GOOGLE_PROVIDER, payload.sub);
    if (identity) {
      return this.handleExistingGoogleIdentity(identity.user, deviceInfo);
    }

    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      return this.handleExistingUserLinking(existingUser, payload.sub, deviceInfo);
    }

    return this.handleNewGoogleUser(payload, email, deviceInfo);
  }

  private async handleExistingGoogleIdentity(
    user: GoogleAuthenticatedUser,
    deviceInfo: DeviceInfo,
  ): Promise<RegisterResponseDTO> {
    this.assertActiveAccount(user.status);

    if (!user.emailVerified) {
      await this.verificationService.issue(user.email);
      return this.verificationRequiredResponse(user);
    }

    await this.authRepository.updateLastLogin(user.id);
    return this.createSession(user.id, deviceInfo);
  }

  private async handleExistingUserLinking(
    user: GoogleAuthenticatedUser,
    providerAccountId: string,
    deviceInfo: DeviceInfo,
  ): Promise<RegisterResponseDTO> {
    this.assertActiveAccount(user.status);

    const alreadyLinked = await this.authRepository.findIdentityByUserIdAndProvider(
      user.id,
      GOOGLE_PROVIDER,
    );
    if (alreadyLinked) {
      throw new ConflictError("This email is already linked to a different Google account");
    }

    await this.linkIdentity(user.id, providerAccountId);

    if (!user.emailVerified) {
      await this.verificationService.issue(user.email);
      return this.verificationRequiredResponse(user);
    }

    await this.authRepository.updateLastLogin(user.id);
    return this.createSession(user.id, deviceInfo);
  }

  private async handleNewGoogleUser(
    payload: GoogleAccountPayload,
    email: string,
    deviceInfo: DeviceInfo,
  ): Promise<RegisterResponseDTO> {
    const roleId = await this.authRepository.getDefaultRoleId();
    const accountNumber = await this.accountNumberService.generateNext();
    const { firstName, lastName } = toGoogleName(payload);

    let user;
    try {
      user = await this.authRepository.createUser({
        email,
        accountNumber,
        passwordHash: null,
        firstName,
        lastName,
        roleId,
        status: "pending",
        emailVerified: false,
        phone: null,
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }
      const raced = await this.authRepository.findUserByEmail(email);
      if (!raced) {
        throw error;
      }
      await this.linkIdentity(raced.id, payload.sub);
      if (!raced.emailVerified) {
        await this.verificationService.issue(raced.email);
        return this.verificationRequiredResponse(raced);
      }
      await this.authRepository.updateLastLogin(raced.id);
      return this.createSession(raced.id, deviceInfo);
    }

    await this.linkIdentity(user.id, payload.sub);
    await this.verificationService.issue(user.email);
    return this.verificationRequiredResponse(user);
  }

  private async linkIdentity(userId: string, providerAccountId: string): Promise<void> {
    try {
      await this.authRepository.createIdentity({
        provider: GOOGLE_PROVIDER,
        providerAccountId,
        userId,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictError("This Google account is already linked to another account");
      }
      throw error;
    }
  }

  private assertActiveAccount(status: string): void {
    if (status !== "active" && status !== "pending") {
      throw new UnauthorizedError("Account is not active");
    }
  }

  private verificationRequiredResponse(user: {
    id: string;
    email: string;
    accountNumber: string;
    role: { name: string };
    emailVerified: boolean;
  }): RegisterResponseDTO {
    return {
      requiresVerification: true,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role.name,
        accountNumber: user.accountNumber,
        emailVerified: user.emailVerified,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.authRepository.findUserByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    const isMatch = user.passwordHash
      ? await comparePassword(currentPassword, user.passwordHash)
      : false;
    if (!isMatch) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.authRepository.updatePassword(userId, passwordHash);
    await this.authRepository.revokeAllUserSessions(userId);
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
    return this.createSession(session.userId, deviceInfo);
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

    const broker = await this.authRepository.findBrokerProfileByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      status: user.status,
      accountNumber: user.accountNumber,
      emailVerified: user.emailVerified,
      broker: broker
        ? { verificationStatus: broker.verificationStatus, isActive: broker.isActive }
        : null,
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

  private async createSession(userId: string, deviceInfo: DeviceInfo): Promise<AuthResponseDTO> {
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
      user: {
        userId: user.id,
        email: user.email,
        role: user.role.name,
        tokenVersion: user.tokenVersion,
        accountNumber: user.accountNumber,
        emailVerified: user.emailVerified,
      },
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

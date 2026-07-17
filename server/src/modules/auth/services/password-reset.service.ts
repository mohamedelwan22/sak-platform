import crypto from "node:crypto";
import { UnauthorizedError } from "../../../lib/errors.js";
import { getEnv } from "../../../config/env.js";
import { hashPassword } from "../utils/index.js";
import { PasswordResetRepository } from "../repositories/password-reset.repository.js";
import type { EmailProvider } from "../../../services/email/email-provider.interface.js";
import { createChildLogger } from "../../../lib/logger.js";

const log = createChildLogger("PasswordResetService");

const TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const CLIENT_URL = "http://localhost:3000";

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetRepository,
    private readonly emailProvider: EmailProvider,
  ) {}

  async requestReset(email: string): Promise<void> {
    log.info("Password Reset Requested", { email });

    const user = await this.repository.findUserByEmail(email);
    if (!user || user.status !== "active") {
      return;
    }

    await this.repository.deleteAllUserResetTokens(user.id);

    const rawToken = crypto.randomBytes(64).toString("hex");
    const tokenHashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await this.repository.createResetToken({
      userId: user.id,
      tokenHash: tokenHashed,
      expiresAt,
    });

    const env = getEnv();
    const baseUrl = env.NODE_ENV === "production" ? "https://sak100.com" : CLIENT_URL;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await this.emailProvider.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
      expiresAt,
    });

    log.info("Password Reset Token Generated", { userId: user.id });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHashed = hashToken(token);

    const storedToken = await this.repository.findValidToken(tokenHashed);
    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    if (storedToken.usedAt) {
      throw new UnauthorizedError("Reset token has already been used");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Reset token has expired");
    }

    if (storedToken.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    const passwordHash = await hashPassword(newPassword);

    await this.repository.updateUserPassword(storedToken.userId, passwordHash);
    await this.repository.markTokenUsed(storedToken.id);
    await this.repository.deleteAllUserResetTokens(storedToken.userId);
    await this.repository.deleteAllRefreshTokens(storedToken.userId);

    log.info("Password Reset Completed", { userId: storedToken.userId });
  }
}

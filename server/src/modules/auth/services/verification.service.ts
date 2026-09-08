import crypto from "node:crypto";
import { UnauthorizedError, ValidationError } from "../../../lib/errors.js";
import { createChildLogger } from "../../../lib/logger.js";
import type { EmailProvider } from "../../../services/email/email-provider.interface.js";
import { EmailVerificationRepository } from "../repositories/email-verification.repository.js";

const log = createChildLogger("VerificationService");

const TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_DIGITS = 6;

function hashCode(rawCode: string): string {
  return crypto.createHash("sha256").update(rawCode).digest("hex");
}

function generateOtp(): string {
  return crypto
    .randomInt(0, 10 ** OTP_DIGITS)
    .toString()
    .padStart(OTP_DIGITS, "0");
}

export class VerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly emailProvider: EmailProvider,
  ) {}

  async issue(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email);

    if (!user || user.emailVerified || user.status === "deleted") {
      return;
    }

    await this.repository.deleteAllUserTokens(user.id);

    const code = generateOtp();
    const tokenHash = hashCode(code);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await this.repository.createToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.emailProvider.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      code,
      expiresAt,
    });

    log.info("Verification code issued", { userId: user.id });
  }

  async verify(
    email: string,
    code: string,
  ): Promise<{
    userId: string;
    email: string;
    firstName: string;
    accountNumber: string;
  }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError("Invalid or expired verification code");
    }

    const storedToken = await this.repository.findLatestTokenByUserId(user.id);
    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired verification code");
    }

    if (storedToken.usedAt) {
      throw new UnauthorizedError("Verification code has already been used");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Verification code has expired");
    }

    if (storedToken.user.emailVerified) {
      throw new ValidationError("Email has already been verified");
    }

    if (storedToken.attempts >= MAX_ATTEMPTS) {
      throw new UnauthorizedError(
        "Too many failed verification attempts. Please request a new code",
      );
    }

    if (hashCode(code.trim()) !== storedToken.tokenHash) {
      const attempts = await this.repository.incrementAttempts(storedToken.id);
      if (attempts >= MAX_ATTEMPTS) {
        await this.repository.deleteAllUserTokens(storedToken.user.id);
      }
      throw new UnauthorizedError("Invalid or expired verification code");
    }

    await this.repository.markTokenUsed(storedToken.id);
    await this.repository.markEmailVerified(storedToken.user.id);
    await this.repository.deleteAllUserTokens(storedToken.user.id);

    log.info("Email verified", { userId: user.id });

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      accountNumber: user.accountNumber,
    };
  }
}

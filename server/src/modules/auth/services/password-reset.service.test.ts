import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "../../../lib/errors.js";
import type { EmailProvider } from "../../../services/email/email-provider.interface.js";
import type { PasswordResetRepository } from "../repositories/password-reset.repository.js";

vi.mock("../../../config/env.js", () => ({
  getEnv: vi.fn(() => ({
    CLIENT_URL: "https://admin.example.test/",
  })),
}));

import { PasswordResetService } from "./password-reset.service.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function makeUser() {
  return {
    id: "user-1",
    email: "user@example.test",
    firstName: "Test",
    passwordHash: "old-hash",
    status: "active",
  };
}

function makeStoredToken(overrides: Partial<{ expiresAt: Date; usedAt: Date | null }> = {}) {
  return {
    id: "reset-1",
    userId: "user-1",
    tokenHash: hashToken("valid-token"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: null,
    user: makeUser(),
    ...overrides,
  };
}

describe("PasswordResetService", () => {
  let repository: {
    [K in keyof PasswordResetRepository]: ReturnType<typeof vi.fn>;
  };
  let emailProvider: { sendPasswordReset: ReturnType<typeof vi.fn> };
  let service: PasswordResetService;

  beforeEach(() => {
    repository = {
      findUserByEmail: vi.fn(async () => makeUser()),
      deleteAllUserResetTokens: vi.fn(async () => 1),
      createResetToken: vi.fn(async () => ({ id: "reset-1" })),
      findValidToken: vi.fn(),
      markTokenUsed: vi.fn(async () => undefined),
      updateUserPassword: vi.fn(async () => undefined),
      deleteAllRefreshTokens: vi.fn(async () => 1),
    };
    emailProvider = {
      sendPasswordReset: vi.fn(async () => undefined),
    };
    service = new PasswordResetService(
      repository as unknown as PasswordResetRepository,
      emailProvider as unknown as EmailProvider,
    );
  });

  it("uses the configured frontend URL for reset links", async () => {
    await service.requestReset("user@example.test");

    const { resetUrl } = emailProvider.sendPasswordReset.mock.calls[0][0];
    expect(resetUrl).toMatch(/^https:\/\/admin\.example\.test\/auth\/reset-password\?token=/);
  });

  it("rejects expired and already-used tokens", async () => {
    repository.findValidToken.mockResolvedValue(makeStoredToken({ expiresAt: new Date(0) }));
    await expect(service.resetPassword("valid-token", "NewPassword!123")).rejects.toMatchObject(
      { message: "Reset token has expired" },
    );

    repository.findValidToken.mockResolvedValue(makeStoredToken({ usedAt: new Date() }));
    await expect(service.resetPassword("valid-token", "NewPassword!123")).rejects.toMatchObject(
      { message: "Reset token has already been used" },
    );
  });

  it("updates the password and invalidates the token after a successful reset", async () => {
    repository.findValidToken.mockResolvedValue(makeStoredToken());

    await service.resetPassword("valid-token", "NewPassword!123");

    expect(repository.updateUserPassword).toHaveBeenCalledWith("user-1", expect.any(String));
    expect(repository.markTokenUsed).toHaveBeenCalledWith("reset-1");
    expect(repository.deleteAllUserResetTokens).toHaveBeenCalledWith("user-1");
    expect(repository.deleteAllRefreshTokens).toHaveBeenCalledWith("user-1");
  });

  it("rejects an invalid token without changing the password", async () => {
    repository.findValidToken.mockResolvedValue(null);

    await expect(service.resetPassword("invalid-token", "NewPassword!123")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.updateUserPassword).not.toHaveBeenCalled();
  });
});

import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError, ValidationError } from "../../../lib/errors.js";
import type { EmailProvider } from "../../../services/email/email-provider.interface.js";
import type { EmailVerificationRepository } from "../repositories/email-verification.repository.js";
import { VerificationService } from "./verification.service.js";

function sha256(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    firstName: string;
    status: string;
    emailVerified: boolean;
    accountNumber: string;
  }> = {},
) {
  return {
    id: "user-1",
    email: "user@example.com",
    firstName: "Test",
    status: "pending",
    emailVerified: false,
    accountNumber: "SAK082419",
    ...overrides,
  };
}

function makeToken(
  overrides: Partial<{
    tokenHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
  }> = {},
  code = "123456",
) {
  return {
    id: "token-1",
    tokenHash: sha256(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: null as Date | null,
    user: makeUser(),
    ...overrides,
  };
}

describe("VerificationService", () => {
  let repository: { [K in keyof EmailVerificationRepository]: ReturnType<typeof vi.fn> };
  let emailProvider: {
    sendVerificationEmail: ReturnType<typeof vi.fn>;
    sendPasswordResetEmail: ReturnType<typeof vi.fn>;
  };
  let service: VerificationService;

  beforeEach(() => {
    repository = {
      findUserByEmail: vi.fn(),
      deleteAllUserTokens: vi.fn(async () => 1),
      createToken: vi.fn(async () => ({ id: "token-1" })),
      findLatestTokenByUserId: vi.fn(),
      incrementAttempts: vi.fn(),
      markTokenUsed: vi.fn(async () => undefined),
      markEmailVerified: vi.fn(async () => undefined),
    };
    emailProvider = {
      sendVerificationEmail: vi.fn(async () => undefined),
      sendPasswordResetEmail: vi.fn(async () => undefined),
    };
    service = new VerificationService(
      repository as unknown as EmailVerificationRepository,
      emailProvider as unknown as EmailProvider,
    );
  });

  it("issues a 6-digit crypto-secure code, hashed in DB, with 15-minute expiry", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());

    await service.issue("USER@example.com");

    expect(repository.deleteAllUserTokens).toHaveBeenCalledWith("user-1");
    expect(repository.createToken).toHaveBeenCalledTimes(1);
    const created = repository.createToken.mock.calls[0][0];
    expect(created.userId).toBe("user-1");
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(created.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000);
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const email = emailProvider.sendVerificationEmail.mock.calls[0][0];
    expect(email.code).toMatch(/^\d{6}$/);
    expect(email.to).toBe("user@example.com");
    expect(sha256(email.code)).toBe(created.tokenHash);
    // Plaintext code must never be stored
    expect(created.tokenHash).not.toBe(email.code);
  });

  it("is a no-op when user missing, already verified, or deleted", async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    await service.issue("missing@example.com");
    expect(repository.createToken).not.toHaveBeenCalled();

    repository.findUserByEmail.mockResolvedValue(makeUser({ emailVerified: true }));
    await service.issue("verified@example.com");
    expect(repository.createToken).not.toHaveBeenCalled();

    repository.findUserByEmail.mockResolvedValue(makeUser({ status: "deleted" }));
    await service.issue("deleted@example.com");
    expect(repository.createToken).not.toHaveBeenCalled();

    expect(emailProvider.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("resend invalidates the previous OTP by deleting old tokens before issuing", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());

    await service.issue("user@example.com");
    await service.issue("user@example.com");

    const calls = repository.deleteAllUserTokens.mock.calls;
    const createCalls = repository.createToken.mock.calls;
    expect(calls.length).toBe(2);
    expect(createCalls.length).toBe(2);
    // delete happened immediately before each new create, and after first create
    expect(calls[1]).toEqual(["user-1"]);
    // second issued token differs from the first
    expect(createCalls[0][0].tokenHash).not.toBe(createCalls[1][0].tokenHash);
    expect(emailProvider.sendVerificationEmail.mock.calls[0][0].code).not.toBe(
      emailProvider.sendVerificationEmail.mock.calls[1][0].code,
    );
  });

  it("verifies a correct code, marks user active, and returns account number", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());
    repository.findLatestTokenByUserId.mockResolvedValue(makeToken());

    const result = await service.verify("user@example.com", "123456");

    expect(repository.markTokenUsed).toHaveBeenCalledWith("token-1");
    expect(repository.markEmailVerified).toHaveBeenCalledWith("user-1");
    expect(repository.deleteAllUserTokens).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      userId: "user-1",
      email: "user@example.com",
      firstName: "Test",
      accountNumber: "SAK082419",
    });
  });

  it("rejects wrong code, increments attempts, and deletes tokens at the 5th failure", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());
    repository.findLatestTokenByUserId.mockResolvedValue(makeToken({}, "123456"));
    repository.incrementAttempts.mockResolvedValue(4);

    await expect(service.verify("user@example.com", "000000")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.incrementAttempts).toHaveBeenCalledWith("token-1");
    expect(repository.deleteAllUserTokens).not.toHaveBeenCalled();

    repository.incrementAttempts.mockResolvedValue(5);
    await expect(service.verify("user@example.com", "000000")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.deleteAllUserTokens).toHaveBeenCalledWith("user-1");
  });

  it("prevents a used single-use code from verifying twice", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());
    repository.findLatestTokenByUserId.mockResolvedValue(makeToken({ usedAt: new Date() }));

    await expect(service.verify("user@example.com", "123456")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.markEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects expired codes", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());
    repository.findLatestTokenByUserId.mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.verify("user@example.com", "123456")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.markEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects verification when attempts are exhausted", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser());
    repository.findLatestTokenByUserId.mockResolvedValue(makeToken({ attempts: 5 }));

    await expect(service.verify("user@example.com", "123456")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repository.markTokenUsed).not.toHaveBeenCalled();
  });

  it("rejects already-verified emails with a validation error", async () => {
    repository.findUserByEmail.mockResolvedValue(makeUser({ emailVerified: true }));
    repository.findLatestTokenByUserId.mockResolvedValue(makeToken({}, "123456"));

    const token = {
      ...makeToken({}, "123456"),
      user: makeUser({ emailVerified: true }),
    };
    repository.findLatestTokenByUserId.mockResolvedValue(token);

    await expect(service.verify("user@example.com", "123456")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.markTokenUsed).not.toHaveBeenCalled();
  });
});

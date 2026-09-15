import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { ConflictError, UnauthorizedError } from "../../../lib/errors.js";
import { hashPassword } from "../utils/index.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import type { AccountNumberService } from "./account-number.service.js";
import type { VerificationService } from "./verification.service.js";
import type { GoogleOidcService } from "./google-oidc.service.js";
import { AuthService } from "./auth.service.js";
import type { Request } from "express";

const req = { headers: {} } as Request;

function googlePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: "google-sub-123",
    email: "new.user@gmail.com",
    emailVerified: true,
    givenName: "New",
    familyName: "User",
    name: "New User",
    ...overrides,
  };
}

function makeGoogleUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "new.user@gmail.com",
    accountNumber: "SAK900001",
    passwordHash: null,
    firstName: "New",
    lastName: "User",
    role: { name: "investor" },
    tokenVersion: 0,
    status: "active",
    emailVerified: true,
    isLocked: false,
    lockedUntil: null,
    failedAttempts: 0,
    ...overrides,
  };
}

function makeCreatedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "new.user@gmail.com",
    accountNumber: "SAK900001",
    firstName: "New",
    lastName: "User",
    role: { name: "investor" },
    tokenVersion: 0,
    emailVerified: false,
    ...overrides,
  };
}

function makeSessionUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "new.user@gmail.com",
    accountNumber: "SAK900001",
    firstName: "New",
    lastName: "User",
    role: { name: "investor" },
    tokenVersion: 0,
    status: "active",
    emailVerified: true,
    ...overrides,
  };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`email`)",
    {
      code: "P2002",
      clientVersion: "7.8.0",
    },
  );
}

type RepoMocks = {
  findIdentityByProvider: ReturnType<typeof vi.fn>;
  findUserByEmail: ReturnType<typeof vi.fn>;
  findIdentityByUserIdAndProvider: ReturnType<typeof vi.fn>;
  createIdentity: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  getDefaultRoleId: ReturnType<typeof vi.fn>;
  updateLastLogin: ReturnType<typeof vi.fn>;
  findUserById: ReturnType<typeof vi.fn>;
  findUserByIdentity: ReturnType<typeof vi.fn>;
  isEmailTaken: ReturnType<typeof vi.fn>;
  resetFailedAttempts: ReturnType<typeof vi.fn>;
  createSession: ReturnType<typeof vi.fn>;
};

function makeHarness(overrides: Partial<RepoMocks> = {}) {
  const repo: RepoMocks = {
    findIdentityByProvider: vi.fn(async () => null),
    findUserByEmail: vi.fn(async () => null),
    findIdentityByUserIdAndProvider: vi.fn(async () => null),
    createIdentity: vi.fn(async () => ({ id: "identity-1" })),
    createUser: vi.fn(),
    getDefaultRoleId: vi.fn(async () => "role-investor"),
    updateLastLogin: vi.fn(async () => undefined),
    findUserById: vi.fn(),
    findUserByIdentity: vi.fn(async () => null),
    isEmailTaken: vi.fn(async () => false),
    resetFailedAttempts: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({ id: "session-1", expiresAt: new Date() })),
    ...overrides,
  };
  const accountNumber = { generateNext: vi.fn(async () => "SAK900001") };
  const verification = {
    issue: vi.fn(async () => undefined),
    verify: vi.fn(async () => ({
      userId: "user-1",
      email: "new.user@gmail.com",
      firstName: "New",
      accountNumber: "SAK900001",
    })),
  };
  const oidc = { verifyCredential: vi.fn(async () => googlePayload()) };
  const service = new AuthService(
    repo as unknown as AuthRepository,
    accountNumber as unknown as AccountNumberService,
    verification as unknown as VerificationService,
    oidc as unknown as GoogleOidcService,
  );
  return { service, repo, accountNumber, verification, oidc };
}

describe("AuthService.googleAuthenticate — new Google registration", () => {
  it("creates a new pending, unverified, passwordless user with a fresh SAK number", async () => {
    const { service, repo, accountNumber } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
    });

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(accountNumber.generateNext).toHaveBeenCalledTimes(1);
    expect(repo.createUser).toHaveBeenCalledWith({
      email: "new.user@gmail.com",
      accountNumber: "SAK900001",
      passwordHash: null,
      firstName: "New",
      lastName: "User",
      roleId: "role-investor",
      status: "pending",
      emailVerified: false,
      phone: null,
    });
  });

  it("issues a verification OTP and returns requiresVerification with no tokens", async () => {
    const { service, repo, verification } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(verification.issue).toHaveBeenCalledWith("new.user@gmail.com");
    expect("requiresVerification" in result && result.requiresVerification).toBe(true);
    expect(result.user).toEqual({
      userId: "user-1",
      email: "new.user@gmail.com",
      role: "investor",
      accountNumber: "SAK900001",
      emailVerified: false,
    });
    expect("accessToken" in result && "refreshToken" in result).toBe(false);
    expect(repo.findUserById).not.toHaveBeenCalled();
  });

  it("links the Google identity using the stable subject id", async () => {
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
    });

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createIdentity).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-123",
      userId: "user-1",
    });
  });

  it("normalizes the Google email to lowercase before creating or looking up", async () => {
    const oidcGoogle = googlePayload({ email: "New.User@Gmail.com" });
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser({ email: "new.user@gmail.com" })),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as unknown as any).googleOidcService.verifyCredential = vi.fn(async () => oidcGoogle);

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.findUserByEmail).toHaveBeenCalledWith("new.user@gmail.com");
  });

  it("treats @googlemail.com as @gmail.com during lookup", async () => {
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
    });
    const oidcGoogle = googlePayload({ email: "same.mailbox@googlemail.com" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as unknown as any).googleOidcService.verifyCredential = vi.fn(async () => oidcGoogle);

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.findUserByEmail).toHaveBeenCalledWith("same.mailbox@gmail.com");
  });

  it("derives names from the full name when given/family names are missing", async () => {
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
    });
    const oidcGoogle = googlePayload({
      givenName: undefined,
      familyName: undefined,
      name: "Only First",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as unknown as any).googleOidcService.verifyCredential = vi.fn(async () => oidcGoogle);

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Only", lastName: "First" }),
    );
  });
});

describe("AuthService.googleAuthenticate — existing Google identity", () => {
  it("logs in an existing linked, verified user with a full session and no OTP", async () => {
    const { service, repo, verification } = makeHarness({
      findIdentityByProvider: vi.fn(async () => ({
        id: "identity-1",
        user: makeGoogleUser(),
      })),
      findUserById: vi.fn(async () => makeSessionUser()),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(verification.issue).not.toHaveBeenCalled();
    expect(result.user.userId).toBe("user-1");
    expect("accessToken" in result && "refreshToken" in result).toBe(true);
    expect(repo.createIdentity).not.toHaveBeenCalled();
    expect(repo.findUserByEmail).not.toHaveBeenCalled();
  });

  it("routes an existing linked but unverified user through OTP with no session", async () => {
    const { service, repo, verification } = makeHarness({
      findIdentityByProvider: vi.fn(async () => ({
        id: "identity-1",
        user: makeGoogleUser({ emailVerified: false, status: "pending" }),
      })),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(verification.issue).toHaveBeenCalledWith("new.user@gmail.com");
    expect("requiresVerification" in result && result.requiresVerification).toBe(true);
    expect(repo.findUserById).not.toHaveBeenCalled();
  });

  it("rejects a linked user whose account is suspended or inactive", async () => {
    const { service, verification } = makeHarness({
      findIdentityByProvider: vi.fn(async () => ({
        id: "identity-1",
        user: makeGoogleUser({ status: "suspended" }),
      })),
    });

    await expect(service.googleAuthenticate({ credential: "jwt" }, req)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(verification.issue).not.toHaveBeenCalled();
  });

  it("resolves by identity before email even when the email differs", async () => {
    const { service, repo } = makeHarness({
      findIdentityByProvider: vi.fn(async () => ({
        id: "identity-1",
        user: makeGoogleUser({ email: "linked@example.com" }),
      })),
      findUserById: vi.fn(async () => makeSessionUser({ email: "linked@example.com" })),
    });
    const oidcGoogle = googlePayload({ email: "other.mailbox@gmail.com" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as unknown as any).googleOidcService.verifyCredential = vi.fn(async () => oidcGoogle);

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.findUserByEmail).not.toHaveBeenCalled();
    expect(result.user.email).toBe("linked@example.com");
  });
});

describe("AuthService.googleAuthenticate — linking an existing SAK account", () => {
  it("links an existing verified email user to Google preserving user id and SAK", async () => {
    const { service, repo } = makeHarness({
      findUserByEmail: vi.fn(async () =>
        makeGoogleUser({ id: "existing-1", accountNumber: "SAK111111" }),
      ),
      findUserById: vi.fn(async () =>
        makeSessionUser({ id: "existing-1", accountNumber: "SAK111111" }),
      ),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createIdentity).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-123",
      userId: "existing-1",
    });
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(result.user.userId).toBe("existing-1");
    expect(result.user.accountNumber).toBe("SAK111111");
  });

  it("does not duplicate the user when linking an existing account", async () => {
    const { service, repo, accountNumber } = makeHarness({
      findUserByEmail: vi.fn(async () => makeGoogleUser({ id: "existing-1" })),
      findUserById: vi.fn(async () => makeSessionUser({ id: "existing-1" })),
    });

    await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createUser).not.toHaveBeenCalled();
    expect(accountNumber.generateNext).not.toHaveBeenCalled();
  });

  it("links an existing unverified email user and routes through OTP with no session", async () => {
    const { service, repo, verification } = makeHarness({
      findUserByEmail: vi.fn(async () =>
        makeGoogleUser({ id: "existing-1", emailVerified: false, status: "pending" }),
      ),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createIdentity).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-123",
      userId: "existing-1",
    });
    expect(verification.issue).toHaveBeenCalledWith("new.user@gmail.com");
    expect("requiresVerification" in result && result.requiresVerification).toBe(true);
    expect(repo.findUserById).not.toHaveBeenCalled();
  });

  it("rejects when the SAK email is already linked to a different Google account", async () => {
    const { service, repo, verification } = makeHarness({
      findUserByEmail: vi.fn(async () => makeGoogleUser({ id: "existing-1" })),
      findIdentityByUserIdAndProvider: vi.fn(async () => ({
        id: "other-identity",
        providerAccountId: "another-sub",
      })),
    });

    await expect(service.googleAuthenticate({ credential: "jwt" }, req)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.createIdentity).not.toHaveBeenCalled();
    expect(verification.issue).not.toHaveBeenCalled();
  });
});

describe("AuthService.googleAuthenticate — conflict and race safety", () => {
  it("rejects a duplicate identity creation race with a ConflictError", async () => {
    const { service, verification } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser()),
      createIdentity: vi.fn(async () => {
        throw p2002();
      }),
    });

    await expect(service.googleAuthenticate({ credential: "jwt" }, req)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(verification.issue).not.toHaveBeenCalled();
  });

  it("rejects a duplicate identity creation race during linking", async () => {
    const { service } = makeHarness({
      findUserByEmail: vi.fn(async () => makeGoogleUser({ id: "existing-1" })),
      createIdentity: vi.fn(async () => {
        throw p2002();
      }),
    });

    await expect(service.googleAuthenticate({ credential: "jwt" }, req)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("recovers when a concurrent registration already created the email user (verified)", async () => {
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => {
        throw p2002();
      }),
      findUserByEmail: vi.fn(async () => makeGoogleUser({ id: "existing-1" })),
      findUserById: vi.fn(async () => makeSessionUser({ id: "existing-1" })),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(repo.createIdentity).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-123",
      userId: "existing-1",
    });
    expect(result.user.userId).toBe("existing-1");
  });

  it("recovers when a concurrent registration already created the email user (unverified)", async () => {
    const { service, repo, verification } = makeHarness({
      createUser: vi.fn(async () => {
        throw p2002();
      }),
      findUserByEmail: vi.fn(async () =>
        makeGoogleUser({ id: "existing-1", emailVerified: false, status: "pending" }),
      ),
    });

    const result = await service.googleAuthenticate({ credential: "jwt" }, req);

    expect(verification.issue).toHaveBeenCalledWith("new.user@gmail.com");
    expect("requiresVerification" in result && result.requiresVerification).toBe(true);
    expect(repo.findUserById).not.toHaveBeenCalled();
  });
});

describe("AuthService.googleAuthenticate — failure handling", () => {
  it("rejects an invalid Google credential before touching the database", async () => {
    const { service, repo } = makeHarness();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as unknown as any).googleOidcService.verifyCredential = vi.fn(async () => {
      throw new UnauthorizedError("Invalid or expired Google credential");
    });

    await expect(service.googleAuthenticate({ credential: "bad" }, req)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(repo.findIdentityByProvider).not.toHaveBeenCalled();
    expect(repo.findUserByEmail).not.toHaveBeenCalled();
  });
});

describe("AuthService regression — password flows unaffected", () => {
  it("prevents a provider-only (passwordless) account from password sign-in", async () => {
    const { service, repo } = makeHarness({
      findUserByIdentity: vi.fn(async () => makeGoogleUser({ status: "active" })),
    });

    await expect(
      service.login({ email: "new.user@gmail.com", password: "Whatever1!" }, { ip: "127.0.0.1" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repo.updateLastLogin).not.toHaveBeenCalled();
  });

  it("still signs in a verified email/password account", async () => {
    const passwordHash = await hashPassword("Reset!Pass2026!");
    const { service, repo } = makeHarness({
      findUserByIdentity: vi.fn(async () =>
        makeGoogleUser({ passwordHash, status: "active", emailVerified: true }),
      ),
      findUserById: vi.fn(async () => makeSessionUser()),
    });

    const result = await service.login(
      { email: "new.user@gmail.com", password: "Reset!Pass2026!" },
      { ip: "127.0.0.1" },
    );

    expect(result.user.userId).toBe("user-1");
    expect("accessToken" in result && "refreshToken" in result).toBe(true);
    expect(repo.resetFailedAttempts).toHaveBeenCalledWith("user-1");
  });

  it("still registers a normal email/password account using the existing flow", async () => {
    const { service, repo } = makeHarness({
      createUser: vi.fn(async () => makeCreatedUser({ emailVerified: true })),
      findUserById: vi.fn(async () => makeSessionUser()),
    });

    const result = await service.register(
      {
        firstName: "New",
        lastName: "User",
        email: "new.user@gmail.com",
        password: "Reset!Pass2026!",
      },
      req,
    );

    const [registerCall] = repo.createUser.mock.calls;
    expect(registerCall?.[0]).toEqual(
      expect.objectContaining({
        email: "new.user@gmail.com",
        passwordHash: expect.any(String),
        roleId: "role-investor",
      }),
    );
    const requiresVerification =
      "requiresVerification" in result ? result.requiresVerification : false;
    const hasSession = "accessToken" in result && "refreshToken" in result;
    expect(requiresVerification || hasSession).toBe(true);
    expect(repo.isEmailTaken).toHaveBeenCalledWith("new.user@gmail.com");
  });

  it("completes Google registration through the existing OTP verify endpoint (session created)", async () => {
    const { service } = makeHarness({
      findUserById: vi.fn(async () => makeSessionUser()),
    });

    const result = await service.verifyEmail("new.user@gmail.com", "123456", req);

    expect(result.user.email).toBe("new.user@gmail.com");
    expect("accessToken" in result && "refreshToken" in result).toBe(true);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

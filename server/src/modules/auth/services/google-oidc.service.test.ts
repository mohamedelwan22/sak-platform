import { describe, expect, it, vi } from "vitest";
import type { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../../lib/errors.js";
import { GoogleOidcService, type GoogleAccountPayload } from "./google-oidc.service.js";

const CLIENT_ID = "client-id-123";
const CLIENT_SECRET = "client-secret-123";

function makeService(
  verifyIdToken: (options: {
    idToken: string;
    audience: string;
  }) => Promise<{ getPayload: () => Record<string, unknown> | undefined }>,
) {
  return new GoogleOidcService({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    client: { verifyIdToken } as unknown as Pick<OAuth2Client, "verifyIdToken">,
  });
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: "accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-sub-123",
    email: "user@example.com",
    email_verified: true,
    given_name: "John",
    family_name: "Doe",
    name: "John Doe",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe("GoogleOidcService", () => {
  it("returns the verified account claims for a valid token", async () => {
    const service = makeService(async () => ({ getPayload: () => validPayload() }));

    const result = await service.verifyCredential("jwt.token.value");

    expect(result).toEqual<GoogleAccountPayload>({
      sub: "google-sub-123",
      email: "user@example.com",
      emailVerified: true,
      givenName: "John",
      familyName: "Doe",
      name: "John Doe",
    });
  });

  it("passes the credential and expected Google audience to the verifier", async () => {
    const verifyIdToken = vi.fn(async () => ({ getPayload: () => validPayload() }));
    const service = makeService(verifyIdToken);

    await service.verifyCredential("jwt.token.value");

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "jwt.token.value",
      audience: CLIENT_ID,
    });
  });

  it("rejects a token with an invalid signature (verifier error)", async () => {
    const service = makeService(async () => {
      throw new Error("Invalid token signature");
    });

    await expect(service.verifyCredential("bad-token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token from an unknown issuer", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ iss: "malicious.example.com" }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token with a missing issuer", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ iss: undefined }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token minted for a different audience", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ aud: "other-client-id" }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects an expired token", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ exp: Math.floor(Date.now() / 1000) - 60 }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token without a subject", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ sub: undefined }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token without an email", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ email: undefined }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token whose email is not verified by Google", async () => {
    const service = makeService(async () => ({
      getPayload: () => validPayload({ email_verified: false }),
    }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a token with no payload at all", async () => {
    const service = makeService(async () => ({ getPayload: () => undefined }));

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects when Google Sign-In is not configured", async () => {
    const service = new GoogleOidcService({
      clientId: "",
      clientSecret: "",
    });

    await expect(service.verifyCredential("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

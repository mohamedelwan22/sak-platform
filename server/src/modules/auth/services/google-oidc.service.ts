import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { UnauthorizedError } from "../../../lib/errors.js";

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export interface GoogleAccountPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
}

interface GoogleOidcOptions {
  clientId: string;
  clientSecret: string;
  client?: Pick<OAuth2Client, "verifyIdToken">;
}

export class GoogleOidcService {
  private readonly client: Pick<OAuth2Client, "verifyIdToken">;
  private readonly clientId: string;

  constructor(options: GoogleOidcOptions) {
    this.clientId = options.clientId;
    this.client = options.client ?? new OAuth2Client(options.clientId, options.clientSecret);
  }

  async verifyCredential(credential: string): Promise<GoogleAccountPayload> {
    if (!this.clientId) {
      throw new UnauthorizedError("Google Sign-In is not configured");
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }

    this.assertPayload(payload);

    const email = payload.email;
    if (!email) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }

    return {
      sub: payload.sub,
      email,
      emailVerified: payload.email_verified === true,
      givenName: payload.given_name,
      familyName: payload.family_name,
      name: payload.name,
    };
  }

  private assertPayload(payload: TokenPayload | undefined): asserts payload is TokenPayload {
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }

    // Signature and audience are verified by google-auth-library against our client ID.
    // Defense in depth for claims that the library does not guarantee in all modes:
    if (!payload.sub) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }
    if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }
    if (payload.aud !== this.clientId) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedError("Invalid or expired Google credential");
    }
    if (!payload.email || payload.email_verified !== true) {
      throw new UnauthorizedError("Google email is not verified");
    }
  }
}

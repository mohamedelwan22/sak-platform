/**
 * Client-side state for an active admin impersonation session.
 *
 * The originating admin's tokens are preserved verbatim so "Return to admin" can
 * restore the real administrative session instantly and losslessly. Nothing here
 * is trusted for authorization — the server re-validates the session on every
 * request — it exists purely so the UI can render an honest banner.
 */

const IMPERSONATION_KEY = "sak100_impersonation";
const ADMIN_ACCESS_KEY = "sak100_admin_access_token";
const ADMIN_REFRESH_KEY = "sak100_admin_refresh_token";

export interface ImpersonationState {
  sessionId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  targetName: string;
  targetRole: string;
  reason: string | null;
  startedAt: string;
  expiresAt: string;
}

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage unavailable — banner degrades, server rules still apply
  }
}

function safeRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const impersonationStorage = {
  /** Parks the admin's own tokens and installs the impersonation access token. */
  begin(state: ImpersonationState, impersonationToken: string, adminAccess: string, adminRefresh: string): void {
    safeSet(ADMIN_ACCESS_KEY, adminAccess);
    safeSet(ADMIN_REFRESH_KEY, adminRefresh);
    safeSet(IMPERSONATION_KEY, JSON.stringify(state));
    safeSet("sak100_access_token", impersonationToken);
  },

  /** Restores the admin's own tokens and drops all impersonation state. */
  end(): { accessToken: string | null; refreshToken: string | null } {
    const accessToken = safeGet(ADMIN_ACCESS_KEY);
    const refreshToken = safeGet(ADMIN_REFRESH_KEY);
    safeRemove(IMPERSONATION_KEY);
    safeRemove(ADMIN_ACCESS_KEY);
    safeRemove(ADMIN_REFRESH_KEY);
    safeRemove("sak100_access_token");
    safeRemove("sak100_refresh_token");
    if (accessToken) safeSet("sak100_access_token", accessToken);
    if (refreshToken) safeSet("sak100_refresh_token", refreshToken);
    return { accessToken, refreshToken };
  },

  get(): ImpersonationState | null {
    const raw = safeGet(IMPERSONATION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ImpersonationState;
      // A session past its TTL is not shown; the server rejects it regardless.
      if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  isActive(): boolean {
    return this.get() !== null;
  },
};

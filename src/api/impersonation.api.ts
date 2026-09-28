import { apiClient } from "./client";

export interface ImpersonationSessionDto {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  targetName: string;
  targetRole: string;
  reason: string | null;
  startedAt: string;
  expiresAt: string;
}

export interface ImpersonationGrantDto {
  accessToken: string;
  expiresIn: string;
  session: ImpersonationSessionDto;
}

export interface ImpersonationHistoryDto {
  id: string;
  reason: string | null;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  revokedAt: string | null;
  ipAddress: string | null;
  state: "active" | "ended" | "expired" | "revoked";
  admin: { id: string; email: string; firstName: string | null; lastName: string | null };
  targetUser: { id: string; email: string; firstName: string | null; lastName: string | null; role: string };
}

export const impersonationApi = {
  /** Opens a short-lived session and returns a token scoped to the target user. */
  start: (input: { targetUserId: string; reason?: string; ttlMinutes?: number }) =>
    apiClient.post<{ data: ImpersonationGrantDto }>("/impersonation/start", input),

  /** Closes the caller's own impersonation session. */
  end: () => apiClient.post<{ data: { sessionId: string } }>("/impersonation/end", {}),

  /** The caller's current session, or null. */
  active: () => apiClient.get<{ data: ImpersonationHistoryDto | null }>("/impersonation/active"),

  /** Audit history (super admin only). */
  sessions: (limit = 50) =>
    apiClient.get<{ data: ImpersonationHistoryDto[] }>("/impersonation/sessions", { params: { limit } }),

  /** Revokes any session by id (super admin only). */
  revoke: (sessionId: string) => apiClient.post("/impersonation/revoke", { sessionId }),
};

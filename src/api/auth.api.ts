import { apiClient } from "./client";
import { tokenStorage } from "@/lib/tokenStorage";
import type { ApiResponse, AuthTokens, AuthUser, User } from "@/types";

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

function getCurrentRefreshTokenHeader(): Record<string, string> {
  const refreshToken = tokenStorage.getRefreshToken();
  return refreshToken ? { "X-Current-Refresh-Token": refreshToken } : {};
}

export const authApi = {
  me: () => apiClient.get<ApiResponse<User>>("/auth/me"),

  login: (data: { email: string; password: string }) =>
    apiClient.post<
      ApiResponse<{ user: AuthUser; accessToken: string; refreshToken: string; expiresIn: string }>
    >("/auth/login", data),

  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    apiClient.post<
      ApiResponse<{ user: AuthUser; accessToken: string; refreshToken: string; expiresIn: string }>
    >("/auth/register", data),

  logout: (refreshToken?: string) =>
    apiClient.post<ApiResponse<null>>("/auth/logout", { refreshToken }),

  logoutAll: () => apiClient.post<ApiResponse<{ deletedCount: number }>>("/auth/logout-all"),

  refresh: (refreshToken?: string) =>
    apiClient.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<null>>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<ApiResponse<null>>("/auth/reset-password", { token, password }),

  getSessions: () =>
    apiClient.get<ApiResponse<SessionInfo[]>>("/auth/sessions", {
      headers: getCurrentRefreshTokenHeader(),
    }),

  deleteSession: (sessionId: string) =>
    apiClient.delete<ApiResponse<null>>(`/auth/sessions/${sessionId}`, {
      headers: getCurrentRefreshTokenHeader(),
    }),
};

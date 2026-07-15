import { apiClient } from "./client";
import type { ApiResponse, AuthTokens, User } from "@/types";

export const authApi = {
  me: () => apiClient.get<ApiResponse<User>>("/auth/me"),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthTokens>>("/auth/login", data),

  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<ApiResponse<AuthTokens>>("/auth/register", data),

  logout: () => apiClient.post<ApiResponse<null>>("/auth/logout"),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),
};

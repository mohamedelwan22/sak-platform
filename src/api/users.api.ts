import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, User, PaginationParams } from "@/types";

export const usersApi = {
  list: (params?: PaginationParams) => apiClient.get<PaginatedResponse<User>>("/users", { params }),

  getById: (id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),

  create: (data: Partial<User>) => apiClient.post<ApiResponse<User>>("/users", data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/users/${id}`),
};

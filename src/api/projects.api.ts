import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, Project, PaginationParams } from "@/types";

export const projectsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Project>>("/projects", { params }),

  getById: (id: string) => apiClient.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: Partial<Project>) => apiClient.post<ApiResponse<Project>>("/projects", data),

  update: (id: string, data: Partial<Project>) =>
    apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/projects/${id}`),
};

import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, City, PaginationParams } from "@/types";

export const citiesApi = {
  list: (params?: PaginationParams & { countryId?: string }) =>
    apiClient.get<PaginatedResponse<City>>("/cities", { params }),

  getById: (id: string) => apiClient.get<ApiResponse<City>>(`/cities/${id}`),

  create: (data: Partial<City>) => apiClient.post<ApiResponse<City>>("/cities", data),

  update: (id: string, data: Partial<City>) =>
    apiClient.put<ApiResponse<City>>(`/cities/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/cities/${id}`),
};

import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, Country, PaginationParams } from "@/types";

export const countriesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Country>>("/countries", { params }),

  getById: (id: string) => apiClient.get<ApiResponse<Country>>(`/countries/${id}`),

  create: (data: Partial<Country>) => apiClient.post<ApiResponse<Country>>("/countries", data),

  update: (id: string, data: Partial<Country>) =>
    apiClient.put<ApiResponse<Country>>(`/countries/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/countries/${id}`),
};

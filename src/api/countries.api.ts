import { apiClient } from "./client";
import type { Country, PaginationParams } from "@/types";

export interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const countriesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<Country>; timestamp: string }>(
      "/countries",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Country; message: string; timestamp: string }>(
      `/countries/${id}`,
    ),

  create: (data: Partial<Country>) =>
    apiClient.post<{ success: boolean; data: Country; message: string; timestamp: string }>(
      "/countries",
      data,
    ),

  update: (id: string, data: Partial<Country>) =>
    apiClient.put<{ success: boolean; data: Country; message: string; timestamp: string }>(
      `/countries/${id}`,
      data,
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/countries/${id}`,
    ),
};

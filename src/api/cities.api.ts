import { apiClient } from "./client";
import type { City, PaginationParams } from "@/types";

export interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CityListParams extends PaginationParams {
  countryId?: string;
}

export const citiesApi = {
  list: (params?: CityListParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<City>; timestamp: string }>("/cities", {
      params,
    }),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: City; message: string; timestamp: string }>(
      `/cities/${id}`,
    ),

  create: (data: { countryId: string; name: string; isActive?: boolean }) =>
    apiClient.post<{ success: boolean; data: City; message: string; timestamp: string }>(
      "/cities",
      data,
    ),

  update: (id: string, data: { countryId?: string; name?: string; isActive?: boolean }) =>
    apiClient.put<{ success: boolean; data: City; message: string; timestamp: string }>(
      `/cities/${id}`,
      data,
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/cities/${id}`,
    ),
};

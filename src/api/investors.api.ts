import { apiClient } from "./client";
import type { Investor, PaginationParams } from "@/types";

export interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InvestorListParams extends PaginationParams {
  search?: string;
  status?: string;
}

export const investorsApi = {
  list: (params?: InvestorListParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<Investor>; timestamp: string }>(
      "/investors",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Investor; message: string; timestamp: string }>(
      `/investors/${id}`,
    ),

  create: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    status?: string;
  }) =>
    apiClient.post<{ success: boolean; data: Investor; message: string; timestamp: string }>(
      "/investors",
      data,
    ),

  update: (
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      status?: string;
    },
  ) =>
    apiClient.put<{ success: boolean; data: Investor; message: string; timestamp: string }>(
      `/investors/${id}`,
      data,
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/investors/${id}`,
    ),

  restore: (id: string) =>
    apiClient.post<{ success: boolean; data: Investor; message: string; timestamp: string }>(
      `/investors/${id}/restore`,
    ),
};

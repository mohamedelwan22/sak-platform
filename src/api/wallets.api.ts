import { apiClient } from "./client";
import type { Wallet, PaginationParams } from "@/types";

interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface WalletListParams extends PaginationParams {
  search?: string;
  status?: string;
}

export const walletsApi = {
  list: (params?: WalletListParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<Wallet>; timestamp: string }>(
      "/wallets",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Wallet; message: string; timestamp: string }>(
      `/wallets/${id}`,
    ),

  create: (data: { userId: string; balance?: number }) =>
    apiClient.post<{ success: boolean; data: Wallet; message: string; timestamp: string }>(
      "/wallets",
      data,
    ),

  update: (id: string, data: { status?: string; frozenBalance?: number }) =>
    apiClient.put<{ success: boolean; data: Wallet; message: string; timestamp: string }>(
      `/wallets/${id}`,
      data,
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/wallets/${id}`,
    ),

  restore: (id: string) =>
    apiClient.post<{ success: boolean; data: Wallet; message: string; timestamp: string }>(
      `/wallets/${id}/restore`,
    ),
};

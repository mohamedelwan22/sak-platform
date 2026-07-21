import { apiClient } from "./client";
import type { Transaction, PaginationParams } from "@/types";

interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TransactionListParams extends PaginationParams {
  walletId?: string;
  type?: string;
  status?: string;
  search?: string;
}

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<Transaction>; timestamp: string }>(
      "/transactions",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Transaction; message: string; timestamp: string }>(
      `/transactions/${id}`,
    ),

  create: (data: { walletId: string; type: string; amount: number; description?: string }) =>
    apiClient.post<{ success: boolean; data: Transaction; message: string; timestamp: string }>(
      "/transactions",
      data,
    ),

  approve: (id: string) =>
    apiClient.post<{ success: boolean; data: Transaction; message: string; timestamp: string }>(
      `/transactions/${id}/approve`,
    ),

  reject: (id: string, data?: { rejectionReason?: string }) =>
    apiClient.post<{ success: boolean; data: Transaction; message: string; timestamp: string }>(
      `/transactions/${id}/reject`,
      data,
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/transactions/${id}`,
    ),
};

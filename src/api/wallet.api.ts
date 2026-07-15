import { apiClient } from "./client";
import type { ApiResponse, Wallet } from "@/types";

export const walletApi = {
  getByUserId: (userId: string) => apiClient.get<ApiResponse<Wallet>>(`/wallets/${userId}`),

  getBalance: (userId: string) =>
    apiClient.get<ApiResponse<{ balance: number }>>(`/wallets/${userId}/balance`),
};

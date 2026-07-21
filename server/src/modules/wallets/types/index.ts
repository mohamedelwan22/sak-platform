import type { Prisma } from "@prisma/client";

export interface WalletData {
  id: string;
  userId: string;
  balance: Prisma.Decimal;
  frozenBalance: Prisma.Decimal;
  status: "active" | "frozen" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface WalletWithUser extends WalletData {
  user: WalletUser;
}

export interface CreateWalletInput {
  userId: string;
  balance?: number;
}

export interface UpdateWalletInput {
  status?: "active" | "frozen" | "closed";
  frozenBalance?: number;
}

export interface WalletFilters {
  search?: string;
  status?: "active" | "frozen" | "closed";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedWallets {
  data: WalletWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

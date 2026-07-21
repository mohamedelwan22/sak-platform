import type { Prisma } from "@prisma/client";

export type TransactionTypeValue =
  "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "adjustment";

export type TransactionStatusValue = "pending" | "approved" | "rejected" | "completed";

export interface TransactionData {
  id: string;
  walletId: string;
  type: TransactionTypeValue;
  amount: Prisma.Decimal;
  status: TransactionStatusValue;
  description: string | null;
  referenceId: string | null;
  rejectionReason: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionWalletUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TransactionWallet {
  id: string;
  userId: string;
  balance: Prisma.Decimal;
  frozenBalance: Prisma.Decimal;
  status: string;
  user: TransactionWalletUser;
}

export interface TransactionWithRelations extends TransactionData {
  wallet: TransactionWallet;
}

export interface CreateTransactionInput {
  walletId: string;
  type: TransactionTypeValue;
  amount: number;
  description?: string;
}

export interface ApproveTransactionInput {
  approvedById: string;
}

export interface RejectTransactionInput {
  rejectionReason: string;
}

export interface TransactionFilters {
  walletId?: string;
  type?: TransactionTypeValue;
  status?: TransactionStatusValue;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  data: TransactionWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

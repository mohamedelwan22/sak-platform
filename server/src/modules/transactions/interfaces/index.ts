import type {
  TransactionData,
  TransactionWithRelations,
  CreateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "../types/index.js";

export interface ITransactionRepository {
  findAll(filters: TransactionFilters): Promise<PaginatedTransactions>;
  findById(id: string): Promise<TransactionWithRelations | null>;
  create(data: CreateTransactionInput): Promise<TransactionData>;
  approve(id: string, approvedById: string): Promise<TransactionData>;
  reject(id: string, rejectionReason: string): Promise<TransactionData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

import type {
  WalletData,
  WalletWithUser,
  CreateWalletInput,
  UpdateWalletInput,
  WalletFilters,
  PaginatedWallets,
} from "../types/index.js";

export interface IWalletRepository {
  findAll(filters: WalletFilters): Promise<PaginatedWallets>;
  findById(id: string): Promise<WalletWithUser | null>;
  findByUserId(userId: string): Promise<WalletData | null>;
  create(data: CreateWalletInput): Promise<WalletWithUser>;
  update(id: string, data: UpdateWalletInput): Promise<WalletWithUser>;
  close(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

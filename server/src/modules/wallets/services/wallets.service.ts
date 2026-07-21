import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import type { WalletRepository } from "../repositories/wallets.repository.js";
import type {
  WalletWithUser,
  CreateWalletInput,
  UpdateWalletInput,
  WalletFilters,
  PaginatedWallets,
} from "../types/index.js";

export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async findAll(filters: WalletFilters): Promise<PaginatedWallets> {
    return this.walletRepository.findAll(filters);
  }

  async findById(id: string): Promise<WalletWithUser> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) throw new NotFoundError("Wallet not found");
    return wallet;
  }

  async create(input: CreateWalletInput): Promise<WalletWithUser> {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundError("User not found");

    const existingWallet = await this.walletRepository.findByUserId(input.userId);
    if (existingWallet) throw new ConflictError("User already has a wallet");

    return this.walletRepository.create(input);
  }

  async update(id: string, input: UpdateWalletInput): Promise<WalletWithUser> {
    const existing = await this.walletRepository.findById(id);
    if (!existing) throw new NotFoundError("Wallet not found");

    if (existing.status === "closed") {
      throw new ConflictError("Cannot update a closed wallet");
    }

    if (input.status === "frozen" && input.frozenBalance === undefined) {
      throw new ConflictError("frozenBalance is required when freezing a wallet");
    }

    if (input.status === "active" && existing.status === "frozen") {
      input.frozenBalance = 0;
    }

    return this.walletRepository.update(id, input);
  }

  async close(id: string): Promise<void> {
    const existing = await this.walletRepository.findById(id);
    if (!existing) throw new NotFoundError("Wallet not found");
    if (existing.status === "closed") throw new ConflictError("Wallet is already closed");
    await this.walletRepository.close(id);
  }

  async restore(id: string): Promise<void> {
    const existing = await this.walletRepository.findById(id);
    if (!existing) throw new NotFoundError("Wallet not found");
    if (existing.status !== "closed") throw new ConflictError("Wallet is not closed");
    await this.walletRepository.restore(id);
  }
}

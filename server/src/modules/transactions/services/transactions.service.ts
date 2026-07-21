import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { TransactionRepository } from "../repositories/transactions.repository.js";
import type {
  TransactionData,
  TransactionWithRelations,
  CreateTransactionInput,
  RejectTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "../types/index.js";

export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async findAll(filters: TransactionFilters): Promise<PaginatedTransactions> {
    return this.transactionRepository.findAll(filters);
  }

  async findById(id: string): Promise<TransactionWithRelations> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) throw new NotFoundError("Transaction not found");
    return transaction;
  }

  async create(input: CreateTransactionInput): Promise<TransactionData> {
    const wallet = await prisma.wallet.findUnique({ where: { id: input.walletId } });
    if (!wallet) throw new NotFoundError("Wallet not found");
    if (wallet.status !== "active") {
      throw new ConflictError("Wallet is not active");
    }

    const transaction = await this.transactionRepository.create(input);
    return transaction;
  }

  async approve(id: string, approvedById: string): Promise<TransactionData> {
    const existing = await this.transactionRepository.findById(id);
    if (!existing) throw new NotFoundError("Transaction not found");
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending transactions can be approved");
    }

    if (existing.type === "withdrawal" || existing.type === "transfer_out") {
      const wallet = await prisma.wallet.findUnique({ where: { id: existing.walletId } });
      if (!wallet) throw new NotFoundError("Wallet not found");

      const availableBalance = wallet.balance.minus(wallet.frozenBalance);
      const amountDecimal = new Prisma.Decimal(existing.amount.toString());
      if (availableBalance.lessThan(amountDecimal)) {
        throw new ConflictError("Insufficient wallet balance");
      }

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: existing.walletId },
          data: {
            balance: {
              decrement: amountDecimal,
            },
          },
        }),
        prisma.transaction.update({
          where: { id },
          data: {
            status: "approved",
            approvedById,
            approvedAt: new Date(),
          },
        }),
      ]);

      const updated = await this.transactionRepository.findById(id);
      if (!updated) throw new NotFoundError("Transaction not found");
      return updated;
    }

    if (existing.type === "deposit" || existing.type === "transfer_in") {
      const amountDecimal = new Prisma.Decimal(existing.amount.toString());

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: existing.walletId },
          data: {
            balance: {
              increment: amountDecimal,
            },
          },
        }),
        prisma.transaction.update({
          where: { id },
          data: {
            status: "approved",
            approvedById,
            approvedAt: new Date(),
          },
        }),
      ]);

      const updated = await this.transactionRepository.findById(id);
      if (!updated) throw new NotFoundError("Transaction not found");
      return updated;
    }

    const approved = await this.transactionRepository.approve(id, approvedById);
    return approved;
  }

  async reject(id: string, input: RejectTransactionInput): Promise<TransactionData> {
    const existing = await this.transactionRepository.findById(id);
    if (!existing) throw new NotFoundError("Transaction not found");
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending transactions can be rejected");
    }

    const rejected = await this.transactionRepository.reject(id, input.rejectionReason);
    return rejected;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.transactionRepository.findById(id);
    if (!existing) throw new NotFoundError("Transaction not found");
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending transactions can be deleted");
    }
    await this.transactionRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.transactionRepository.count();
  }
}

import type { Prisma, Transaction, Wallet, User } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { ITransactionRepository } from "../interfaces/index.js";
import type {
  TransactionData,
  TransactionWithRelations,
  CreateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "../types/index.js";

type TransactionWithWalletRow = Transaction & {
  wallet: Wallet & {
    user: Pick<User, "id" | "firstName" | "lastName" | "email">;
  };
};

export class TransactionRepository implements ITransactionRepository {
  async findAll(filters: TransactionFilters): Promise<PaginatedTransactions> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          wallet: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map(this.mapTransaction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<TransactionWithRelations | null> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        wallet: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    return transaction ? this.mapTransaction(transaction) : null;
  }

  async create(data: CreateTransactionInput): Promise<TransactionData> {
    const transaction = await prisma.transaction.create({
      data: {
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        description: data.description ?? null,
      },
    });
    return this.mapTransactionData(transaction);
  }

  async approve(id: string, approvedById: string): Promise<TransactionData> {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: "approved",
        approvedById,
        approvedAt: new Date(),
      },
    });
    return this.mapTransactionData(transaction);
  }

  async reject(id: string, rejectionReason: string): Promise<TransactionData> {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason,
      },
    });
    return this.mapTransactionData(transaction);
  }

  async delete(id: string): Promise<void> {
    await prisma.transaction.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.transaction.count();
  }

  private buildWhereClause(filters: TransactionFilters): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.walletId) {
      where.walletId = filters.walletId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { rejectionReason: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: TransactionFilters): Prisma.TransactionOrderByWithRelationInput {
    const allowed = ["amount", "type", "status", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  private mapTransaction(row: TransactionWithWalletRow): TransactionWithRelations {
    return {
      id: row.id,
      walletId: row.walletId,
      type: row.type,
      amount: row.amount,
      status: row.status,
      description: row.description ?? null,
      referenceId: row.referenceId ?? null,
      rejectionReason: row.rejectionReason ?? null,
      approvedById: row.approvedById ?? null,
      approvedAt: row.approvedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      wallet: {
        id: row.wallet.id,
        userId: row.wallet.userId,
        balance: row.wallet.balance,
        frozenBalance: row.wallet.frozenBalance,
        status: row.wallet.status,
        user: {
          id: row.wallet.user.id,
          firstName: row.wallet.user.firstName,
          lastName: row.wallet.user.lastName,
          email: row.wallet.user.email,
        },
      },
    };
  }

  private mapTransactionData(row: Transaction): TransactionData {
    return {
      id: row.id,
      walletId: row.walletId,
      type: row.type,
      amount: row.amount,
      status: row.status,
      description: row.description ?? null,
      referenceId: row.referenceId ?? null,
      rejectionReason: row.rejectionReason ?? null,
      approvedById: row.approvedById ?? null,
      approvedAt: row.approvedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

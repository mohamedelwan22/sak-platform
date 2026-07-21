import type { Prisma, Wallet, User } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IWalletRepository } from "../interfaces/index.js";
import type {
  WalletData,
  WalletWithUser,
  CreateWalletInput,
  UpdateWalletInput,
  WalletFilters,
  PaginatedWallets,
} from "../types/index.js";

type WalletWithUserRow = Wallet & {
  user: Pick<User, "id" | "firstName" | "lastName" | "email">;
};

export class WalletRepository implements IWalletRepository {
  async findAll(filters: WalletFilters): Promise<PaginatedWallets> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      data: data.map(this.mapWallet),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<WalletWithUser | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return wallet ? this.mapWallet(wallet) : null;
  }

  async findByUserId(userId: string): Promise<WalletData | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });
    return wallet ? this.mapWalletData(wallet) : null;
  }

  async create(data: CreateWalletInput): Promise<WalletWithUser> {
    const wallet = await prisma.wallet.create({
      data: {
        userId: data.userId,
        balance: data.balance ?? 0,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.mapWallet(wallet);
  }

  async update(id: string, data: UpdateWalletInput): Promise<WalletWithUser> {
    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.frozenBalance !== undefined && { frozenBalance: data.frozenBalance }),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.mapWallet(wallet);
  }

  async close(id: string): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { status: "closed" },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { status: "active" },
    });
  }

  private buildWhereClause(filters: WalletFilters): Prisma.WalletWhereInput {
    const where: Prisma.WalletWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.user = {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    return where;
  }

  private buildOrderBy(filters: WalletFilters): Prisma.WalletOrderByWithRelationInput {
    const allowed = ["balance", "frozenBalance", "status", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    if (sortBy === "user.firstName" || sortBy === "user.lastName" || sortBy === "user.email") {
      const field = sortBy.split(".")[1];
      return { user: { [field]: sortOrder } };
    }

    return { [sortBy]: sortOrder };
  }

  private mapWallet(row: WalletWithUserRow): WalletWithUser {
    return {
      id: row.id,
      userId: row.userId,
      balance: row.balance,
      frozenBalance: row.frozenBalance,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
      },
    };
  }

  private mapWalletData(row: Wallet): WalletData {
    return {
      id: row.id,
      userId: row.userId,
      balance: row.balance,
      frozenBalance: row.frozenBalance,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

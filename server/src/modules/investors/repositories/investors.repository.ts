import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IInvestorRepository } from "../interfaces/index.js";
import type {
  InvestorData,
  InvestorWithRelations,
  CreateInvestorInput,
  UpdateInvestorInput,
  InvestorFilters,
  PaginatedInvestors,
} from "../types/index.js";

export class InvestorRepository implements IInvestorRepository {
  async findAll(filters: InvestorFilters): Promise<PaginatedInvestors> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { sessions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: data.map(this.mapInvestor),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<InvestorWithRelations | null> {
    const investor = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { sessions: true } },
      },
    });
    return investor ? this.mapInvestor(investor) : null;
  }

  async findByEmail(email: string): Promise<InvestorData | null> {
    const investor = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    return investor ? this.mapInvestor({ ...investor, _count: { sessions: 0 } }) : null;
  }

  async findByPhone(phone: string): Promise<InvestorData | null> {
    const investor = await prisma.user.findFirst({
      where: { phone, deletedAt: null },
    });
    return investor ? this.mapInvestor({ ...investor, _count: { sessions: 0 } }) : null;
  }

  async create(data: CreateInvestorInput, roleId: string): Promise<InvestorData> {
    const investor = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        roleId,
        status: (data.status as "active" | "inactive" | "suspended" | "pending") ?? "active",
      },
    });
    return this.mapInvestor({ ...investor, _count: { sessions: 0 } });
  }

  async update(id: string, data: UpdateInvestorInput): Promise<InvestorData> {
    const investor = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.status !== undefined && {
          status: data.status as "active" | "inactive" | "suspended" | "pending",
        }),
      },
    });
    return this.mapInvestor({ ...investor, _count: { sessions: 0 } });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "inactive" },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: null, status: "active" },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count({
      where: {
        deletedAt: null,
        role: { name: "investor" },
      },
    });
  }

  private buildWhereClause(filters: InvestorFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: { name: "investor" },
    };

    if (filters.status) {
      where.status = filters.status as "active" | "inactive" | "suspended" | "pending";
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: InvestorFilters): Prisma.UserOrderByWithRelationInput {
    const allowed = ["firstName", "lastName", "email", "status", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapInvestor(row: any): InvestorWithRelations {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone ?? null,
      status: row.status,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
      _count: row._count ?? { sessions: 0 },
    };
  }
}

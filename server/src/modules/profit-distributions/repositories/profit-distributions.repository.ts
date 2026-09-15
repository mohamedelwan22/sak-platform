import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IProfitDistributionRepository } from "../interfaces/index.js";
import {
  PROFIT_DISTRIBUTION_SORTABLE_FIELDS,
  PROFIT_PAYOUT_SORTABLE_FIELDS,
} from "../constants/index.js";
import type {
  ProfitDistributionData,
  ProfitDistributionFilters,
  ProfitDistributionPreview,
  ProfitDistributionPreviewItem,
  ProfitDistributionWithLand,
  ProfitDistributionWithPayouts,
  PaginatedProfitDistributions,
  PaginatedProfitPayouts,
  ProfitPayoutFilters,
  ProfitPayoutWithUser,
  CreateProfitDistributionInput,
} from "../types/index.js";

const profitDistributionSelect = {
  id: true,
  landId: true,
  totalProfitUsd: true,
  periodStart: true,
  periodEnd: true,
  distributedBy: true,
  distributedAt: true,
  createdAt: true,
  land: {
    select: {
      id: true,
      titleEn: true,
      titleAr: true,
      projectId: true,
    },
  },
  distributor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.ProfitDistributionSelect;

type ProfitDistributionRow = Prisma.ProfitDistributionGetPayload<{
  select: typeof profitDistributionSelect;
}>;

const profitDistributionWithPayoutsSelect = {
  ...profitDistributionSelect,
  payouts: {
    select: {
      id: true,
      distributionId: true,
      userId: true,
      holdingId: true,
      ownershipPercent: true,
      payoutUsd: true,
      payoutSak: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.ProfitDistributionSelect;

type ProfitDistributionWithPayoutsRow = Prisma.ProfitDistributionGetPayload<{
  select: typeof profitDistributionWithPayoutsSelect;
}>;

const profitPayoutSelect = {
  id: true,
  distributionId: true,
  userId: true,
  holdingId: true,
  ownershipPercent: true,
  payoutUsd: true,
  payoutSak: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  holding: {
    select: {
      id: true,
      land: {
        select: {
          id: true,
          titleAr: true,
        },
      },
    },
  },
} satisfies Prisma.ProfitPayoutSelect;

type ProfitPayoutRow = Prisma.ProfitPayoutGetPayload<{
  select: typeof profitPayoutSelect;
}>;

export class ProfitDistributionRepository implements IProfitDistributionRepository {
  async findAll(filters: ProfitDistributionFilters): Promise<PaginatedProfitDistributions> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.profitDistribution.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: profitDistributionSelect,
      }),
      prisma.profitDistribution.count({ where }),
    ]);

    return {
      data: data.map(this.mapProfitDistribution),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<ProfitDistributionWithPayouts | null> {
    const row = await prisma.profitDistribution.findUnique({
      where: { id },
      select: profitDistributionWithPayoutsSelect,
    });
    if (!row) return null;
    return this.mapProfitDistributionWithPayouts(row);
  }

  async create(data: CreateProfitDistributionInput): Promise<ProfitDistributionData> {
    const created = await prisma.$transaction(async (tx) => {
      const distribution = await tx.profitDistribution.create({
        data: {
          landId: data.landId,
          totalProfitUsd: data.totalProfitUsd,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          distributedBy: data.distributedBy,
        },
        select: {
          id: true,
          landId: true,
          totalProfitUsd: true,
          periodStart: true,
          periodEnd: true,
          distributedBy: true,
          distributedAt: true,
          createdAt: true,
        },
      });

      if (data.payouts.length > 0) {
        await tx.profitPayout.createMany({
          data: data.payouts.map((p) => ({
            distributionId: distribution.id,
            userId: p.userId,
            holdingId: p.holdingId,
            ownershipPercent: p.ownershipPercent,
            payoutUsd: p.payoutUsd,
            payoutSak: p.payoutSak,
          })),
        });
      }

      return distribution;
    });

    return this.mapProfitDistributionData(created);
  }

  async count(): Promise<number> {
    return prisma.profitDistribution.count();
  }

  async findPayouts(filters: ProfitPayoutFilters): Promise<PaginatedProfitPayouts> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildPayoutWhereClause(filters);
    const orderBy = this.buildPayoutOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.profitPayout.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: profitPayoutSelect,
      }),
      prisma.profitPayout.count({ where }),
    ]);

    return {
      data: data.map(this.mapProfitPayoutWithUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findPayoutsByDistributionId(distributionId: string): Promise<ProfitPayoutWithUser[]> {
    const rows = await prisma.profitPayout.findMany({
      where: { distributionId },
      select: profitPayoutSelect,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(this.mapProfitPayoutWithUser);
  }

  async findPayoutsByUserId(userId: string): Promise<ProfitPayoutWithUser[]> {
    const rows = await prisma.profitPayout.findMany({
      where: { userId },
      select: profitPayoutSelect,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(this.mapProfitPayoutWithUser);
  }

  async getPreview(landId: string, totalProfitUsd: number): Promise<ProfitDistributionPreview> {
    const land = await prisma.land.findUnique({
      where: { id: landId },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        totalSakInventory: true,
      },
    });
    if (!land) {
      throw new Error("Land not found");
    }

    const holdings = await prisma.holding.findMany({
      where: {
        landId,
        status: "active",
      },
      select: {
        id: true,
        userId: true,
        sakOwned: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const totalSakOwned = holdings.reduce((sum, h) => sum + Number(h.sakOwned), 0);

    const items: ProfitDistributionPreviewItem[] = holdings.map((h) => {
      const ownershipPercent = totalSakOwned > 0 ? (Number(h.sakOwned) / totalSakOwned) * 100 : 0;
      const payoutUsd =
        totalSakOwned > 0 ? (Number(h.sakOwned) / totalSakOwned) * totalProfitUsd : 0;
      const sakPricePerSak = totalProfitUsd / Number(land.totalSakInventory);
      const payoutSak = Number(h.sakOwned) * sakPricePerSak;

      return {
        holdingId: h.id,
        userId: h.userId,
        userFullName: `${h.user.firstName} ${h.user.lastName}`,
        sakOwned: Number(h.sakOwned),
        ownershipPercent: Math.round(ownershipPercent * 100) / 100,
        payoutUsd: Math.round(payoutUsd * 100) / 100,
        payoutSak: Math.round(payoutSak * 100) / 100,
      };
    });

    return {
      landId: land.id,
      landTitleEn: land.titleEn,
      landTitleAr: land.titleAr,
      totalSakInventory: Number(land.totalSakInventory),
      totalSakOwned,
      totalProfitUsd,
      items,
    };
  }

  private buildWhereClause(
    filters: ProfitDistributionFilters,
  ): Prisma.ProfitDistributionWhereInput {
    const where: Prisma.ProfitDistributionWhereInput = {};
    if (filters.landId) where.landId = filters.landId;
    if (filters.distributedBy) where.distributedBy = filters.distributedBy;
    return where;
  }

  private buildOrderBy(
    filters: ProfitDistributionFilters,
  ): Prisma.ProfitDistributionOrderByWithRelationInput {
    const field = PROFIT_DISTRIBUTION_SORTABLE_FIELDS.includes(
      filters.sortBy as (typeof PROFIT_DISTRIBUTION_SORTABLE_FIELDS)[number],
    )
      ? filters.sortBy!
      : "distributedAt";
    return { [field]: filters.sortOrder ?? "desc" };
  }

  private buildPayoutWhereClause(filters: ProfitPayoutFilters): Prisma.ProfitPayoutWhereInput {
    const where: Prisma.ProfitPayoutWhereInput = {};
    if (filters.distributionId) where.distributionId = filters.distributionId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.holdingId) where.holdingId = filters.holdingId;
    if (filters.status) where.status = filters.status as "pending" | "completed" | "failed";
    return where;
  }

  private buildPayoutOrderBy(
    filters: ProfitPayoutFilters,
  ): Prisma.ProfitPayoutOrderByWithRelationInput {
    const field = PROFIT_PAYOUT_SORTABLE_FIELDS.includes(
      filters.sortBy as (typeof PROFIT_PAYOUT_SORTABLE_FIELDS)[number],
    )
      ? filters.sortBy!
      : "createdAt";
    return { [field]: filters.sortOrder ?? "desc" };
  }

  private mapProfitDistribution(row: ProfitDistributionRow): ProfitDistributionWithLand {
    return {
      id: row.id,
      landId: row.landId,
      totalProfitUsd: Number(row.totalProfitUsd),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      distributedBy: row.distributedBy,
      distributedAt: row.distributedAt,
      createdAt: row.createdAt,
      land: {
        id: row.land.id,
        titleEn: row.land.titleEn,
        titleAr: row.land.titleAr,
        projectId: row.land.projectId,
      },
      distributor: {
        id: row.distributor.id,
        firstName: row.distributor.firstName,
        lastName: row.distributor.lastName,
        email: row.distributor.email,
      },
    };
  }

  private mapProfitDistributionWithPayouts(
    row: ProfitDistributionWithPayoutsRow,
  ): ProfitDistributionWithPayouts {
    return {
      ...this.mapProfitDistribution(row),
      payouts: row.payouts.map((p) => ({
        id: p.id,
        distributionId: p.distributionId,
        userId: p.userId,
        holdingId: p.holdingId,
        ownershipPercent: Number(p.ownershipPercent),
        payoutUsd: Number(p.payoutUsd),
        payoutSak: Number(p.payoutSak),
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  private mapProfitDistributionData(row: {
    id: string;
    landId: string;
    totalProfitUsd: Prisma.Decimal;
    periodStart: Date;
    periodEnd: Date;
    distributedBy: string;
    distributedAt: Date;
    createdAt: Date;
  }): ProfitDistributionData {
    return {
      id: row.id,
      landId: row.landId,
      totalProfitUsd: Number(row.totalProfitUsd),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      distributedBy: row.distributedBy,
      distributedAt: row.distributedAt,
      createdAt: row.createdAt,
    };
  }

  private mapProfitPayoutWithUser(row: ProfitPayoutRow): ProfitPayoutWithUser {
    return {
      id: row.id,
      distributionId: row.distributionId,
      userId: row.userId,
      holdingId: row.holdingId,
      ownershipPercent: Number(row.ownershipPercent),
      payoutUsd: Number(row.payoutUsd),
      payoutSak: Number(row.payoutSak),
      status: row.status,
      createdAt: row.createdAt,
      user: {
        id: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
      },
      holding: row.holding
        ? {
            id: row.holding.id,
            land: row.holding.land
              ? { id: row.holding.land.id, titleAr: row.holding.land.titleAr }
              : null,
          }
        : null,
    };
  }
}

import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IHoldingRepository } from "../interfaces/index.js";
import type {
  HoldingData,
  HoldingWithRelations,
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilters,
  PaginatedHoldings,
  PortfolioSummary,
} from "../types/index.js";

export class HoldingRepository implements IHoldingRepository {
  async findAll(filters: HoldingFilters): Promise<PaginatedHoldings> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.holding.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          land: {
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              assetType: true,
              country: true,
              city: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  titleEn: true,
                  titleAr: true,
                },
              },
            },
          },
        },
      }),
      prisma.holding.count({ where }),
    ]);

    return {
      data: data.map(this.mapHolding),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<HoldingWithRelations | null> {
    const holding = await prisma.holding.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        land: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            assetType: true,
            country: true,
            city: true,
            projectId: true,
            project: {
              select: {
                id: true,
                titleEn: true,
                titleAr: true,
              },
            },
          },
        },
      },
    });
    return holding ? this.mapHolding(holding) : null;
  }

  async findByUserId(userId: string): Promise<HoldingWithRelations[]> {
    const holdings = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        land: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            assetType: true,
            country: true,
            city: true,
            projectId: true,
            project: {
              select: {
                id: true,
                titleEn: true,
                titleAr: true,
              },
            },
          },
        },
      },
    });
    return holdings.map(this.mapHolding);
  }

  async create(data: CreateHoldingInput): Promise<HoldingData> {
    const holding = await prisma.holding.create({
      data: {
        userId: data.userId,
        landId: data.landId,
        sakOwned: data.sakOwned,
        purchasePricePerSakUsd: data.purchasePricePerSakUsd,
        maturityDate: data.maturityDate,
        status: (data.status as "active" | "matured" | "sold" | "closed") ?? "active",
      },
    });
    return this.mapHoldingData(holding);
  }

  async update(id: string, data: UpdateHoldingInput): Promise<HoldingData> {
    const holding = await prisma.holding.update({
      where: { id },
      data: {
        ...(data.status !== undefined && {
          status: data.status,
        }),
      },
    });
    return this.mapHoldingData(holding);
  }

  async delete(id: string): Promise<void> {
    await prisma.holding.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.holding.count();
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const holdings = await prisma.holding.findMany({
      where: { userId },
      include: {
        land: {
          select: {
            id: true,
            titleAr: true,
          },
        },
      },
    });

    const latestGoldPrice = await prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const latestSakConfig = await prisma.sakConfig.findFirst({
      orderBy: { effectiveFrom: "desc" },
    });

    const currentGoldPerGram = latestGoldPrice
      ? Number(latestGoldPrice.gramPriceUsd)
      : 0;
    const sakToGoldRatio = latestSakConfig
      ? Number(latestSakConfig.sakToGoldRatio)
      : 1;
    const currentSakPrice = currentGoldPerGram * sakToGoldRatio;

    let totalInvestedUsd = 0;
    let totalSakOwned = 0;
    let activeHoldings = 0;
    let maturedHoldings = 0;

    const landMap = new Map<
      string,
      { titleAr: string; sakOwned: number; totalCostUsd: number }
    >();

    for (const holding of holdings) {
      const sak = Number(holding.sakOwned);
      const pricePerSak = Number(holding.purchasePricePerSakUsd);
      const cost = sak * pricePerSak;

      totalInvestedUsd += cost;
      totalSakOwned += sak;

      if (holding.status === "active") activeHoldings++;
      if (holding.status === "matured") maturedHoldings++;

      const existing = landMap.get(holding.landId);
      if (existing) {
        existing.sakOwned += sak;
        existing.totalCostUsd += cost;
      } else {
        landMap.set(holding.landId, {
          titleAr: holding.land.titleAr,
          sakOwned: sak,
          totalCostUsd: cost,
        });
      }
    }

    const currentValueUsd = totalSakOwned * currentSakPrice;
    const totalProfitUsd = currentValueUsd - totalInvestedUsd;
    const profitPercent =
      totalInvestedUsd > 0 ? (totalProfitUsd / totalInvestedUsd) * 100 : 0;

    const assetAllocation = Array.from(landMap.entries()).map(
      ([landId, info]) => ({
        landId,
        titleAr: info.titleAr,
        sakOwned: info.sakOwned,
        percent: totalSakOwned > 0 ? (info.sakOwned / totalSakOwned) * 100 : 0,
      }),
    );

    return {
      totalInvestedUsd,
      currentValueUsd,
      totalProfitUsd,
      profitPercent,
      totalSakOwned,
      activeHoldings,
      maturedHoldings,
      assetAllocation,
    };
  }

  private buildWhereClause(filters: HoldingFilters): Prisma.HoldingWhereInput {
    const where: Prisma.HoldingWhereInput = {};
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.landId) {
      where.landId = filters.landId;
    }
    if (filters.status) {
      where.status = filters.status as "active" | "matured" | "sold" | "closed";
    }
    return where;
  }

  private buildOrderBy(
    filters: HoldingFilters,
  ): Prisma.HoldingOrderByWithRelationInput {
    const allowed = ["createdAt", "purchaseDate", "sakOwned", "status"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy)
        ? filters.sortBy
        : "createdAt";
    const sortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapHolding(row: any): HoldingWithRelations {
    return {
      id: row.id,
      userId: row.userId,
      landId: row.landId,
      sakOwned: Number(row.sakOwned),
      purchasePricePerSakUsd: Number(row.purchasePricePerSakUsd),
      purchaseDate: row.purchaseDate,
      maturityDate: row.maturityDate,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user,
      land: row.land,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapHoldingData(row: any): HoldingData {
    return {
      id: row.id,
      userId: row.userId,
      landId: row.landId,
      sakOwned: Number(row.sakOwned),
      purchasePricePerSakUsd: Number(row.purchasePricePerSakUsd),
      purchaseDate: row.purchaseDate,
      maturityDate: row.maturityDate,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

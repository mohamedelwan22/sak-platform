import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { resolveCurrentSakPrice, resolveLatestGoldPrice } from "../../../services/pricing.service.js";
import type { IHoldingRepository } from "../interfaces/index.js";
import type {
  HoldingData,
  HoldingWithRelations,
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilters,
  PaginatedHoldings,
  PortfolioSummary,
  RealAsset,
  RealAssetHolding,
  RealAssetProject,
  RealAssetsResult,
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
      where: { effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: "desc" },
    });

    const currentGoldPerGram = latestGoldPrice ? Number(latestGoldPrice.gramPriceUsd) : 0;
    const sakToGoldRatio = latestSakConfig ? Number(latestSakConfig.sakToGoldRatio) : 1;
    const currentSakPrice = currentGoldPerGram * sakToGoldRatio;

    let totalInvestedUsd = 0;
    let totalSakOwned = 0;
    let activeHoldings = 0;
    let maturedHoldings = 0;

    const landMap = new Map<string, { titleAr: string; sakOwned: number; totalCostUsd: number }>();

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
    const profitPercent = totalInvestedUsd > 0 ? (totalProfitUsd / totalInvestedUsd) * 100 : 0;

    const assetAllocation = Array.from(landMap.entries()).map(([landId, info]) => ({
      landId,
      titleAr: info.titleAr,
      sakOwned: info.sakOwned,
      percent: totalSakOwned > 0 ? (info.sakOwned / totalSakOwned) * 100 : 0,
    }));

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

  async getRealAssets(userId: string): Promise<RealAssetsResult> {
    const holdings = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        land: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            assetType: true,
            country: true,
            city: true,
            areaM2: true,
            status: true,
            riskLevel: true,
            expectedRoi: true,
            maturityMonths: true,
            coverImageUrl: true,
            lat: true,
            lng: true,
            project: {
              select: {
                id: true,
                titleEn: true,
                titleAr: true,
                country: true,
                city: true,
                riskLevel: true,
                expectedRoi: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const [sakPrice, latestGold] = await Promise.all([
      resolveCurrentSakPrice(prisma),
      resolveLatestGoldPrice(prisma),
    ]);
    const sakPriceUsd = sakPrice ? Number(sakPrice) : null;
    const valuationDate = latestGold ? latestGold.createdAt : null;

    const totalSakOwned = holdings.reduce((sum, h) => sum + Number(h.sakOwned), 0);
    const landMap = new Map<string, RealAsset>();

    for (const h of holdings) {
      const land = h.land;
      let asset = landMap.get(land.id);
      if (!asset) {
        asset = {
          landId: land.id,
          landTitleAr: land.titleAr,
          landTitleEn: land.titleEn,
          assetType: land.assetType,
          country: land.country,
          city: land.city,
          areaM2: Number(land.areaM2),
          landStatus: land.status,
          riskLevel: land.riskLevel,
          expectedRoi: Number(land.expectedRoi),
          maturityMonths: land.maturityMonths,
          coverImageUrl: land.coverImageUrl,
          lat: land.lat ? Number(land.lat) : null,
          lng: land.lng ? Number(land.lng) : null,
          project: land.project ? this.mapProject(land.project) : null,
          sakOwned: 0,
          totalCostUsd: 0,
          averagePurchasePriceUsd: 0,
          currentValueUsd: null,
          allocationPercent: 0,
          holdings: [],
        };
        landMap.set(land.id, asset);
      }

      const sak = Number(h.sakOwned);
      const cost = sak * Number(h.purchasePricePerSakUsd);
      asset.sakOwned += sak;
      asset.totalCostUsd += cost;
      asset.holdings.push(this.mapHoldingDetail(h));
    }

    const assets = Array.from(landMap.values())
      .map((asset) => {
        asset.averagePurchasePriceUsd =
          asset.sakOwned > 0 ? asset.totalCostUsd / asset.sakOwned : 0;
        asset.currentValueUsd =
          sakPriceUsd != null && asset.sakOwned > 0 ? asset.sakOwned * sakPriceUsd : null;
        asset.allocationPercent = totalSakOwned > 0 ? (asset.sakOwned / totalSakOwned) * 100 : 0;
        return asset;
      })
      .sort((a, b) => (b.currentValueUsd ?? 0) - (a.currentValueUsd ?? 0));

    return {
      assets,
      totalSakOwned,
      totalValueUsd:
        sakPriceUsd != null && totalSakOwned > 0 ? totalSakOwned * sakPriceUsd : null,
      sakPriceUsd,
      valuationDate,
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

  private buildOrderBy(filters: HoldingFilters): Prisma.HoldingOrderByWithRelationInput {
    const allowed = ["createdAt", "purchaseDate", "sakOwned", "status"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProject(project: any): RealAssetProject {
    return {
      id: project.id,
      titleEn: project.titleEn,
      titleAr: project.titleAr,
      country: project.country,
      city: project.city,
      riskLevel: project.riskLevel,
      expectedRoi: Number(project.expectedRoi),
      status: project.status,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapHoldingDetail(row: any): RealAssetHolding {
    return {
      id: row.id,
      sakOwned: Number(row.sakOwned),
      purchasePricePerSakUsd: Number(row.purchasePricePerSakUsd),
      purchaseDate: row.purchaseDate,
      maturityDate: row.maturityDate,
      status: row.status,
    };
  }
}

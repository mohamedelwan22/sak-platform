import { prisma } from "../../../lib/prisma.js";
import type {
  IPerformanceRepository,
  PerformanceHolding,
  PerformanceHoldingEvent,
  PerformancePayout,
} from "../interfaces/index.js";

export class PerformanceRepository implements IPerformanceRepository {
  async findHoldingsByUser(userId: string): Promise<PerformanceHolding[]> {
    const rows = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        landId: true,
        sakOwned: true,
        purchasePricePerSakUsd: true,
        status: true,
        createdAt: true,
        land: {
          select: {
            id: true,
            titleAr: true,
            project: { select: { titleAr: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      landId: row.landId,
      landTitleAr: row.land.titleAr,
      projectTitleAr: row.land.project?.titleAr ?? null,
      sakOwned: row.sakOwned,
      purchasePricePerSakUsd: row.purchasePricePerSakUsd,
      status: row.status as PerformanceHolding["status"],
      createdAt: row.createdAt,
    }));
  }

  async findHoldingEventsByUser(userId: string): Promise<PerformanceHoldingEvent[]> {
    const rows = await prisma.transaction.findMany({
      where: {
        status: "completed",
        holdingId: { not: null },
        wallet: { userId },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        sakAmount: true,
        holdingId: true,
        createdAt: true,
      },
    });

    const events: PerformanceHoldingEvent[] = [];
    for (const row of rows) {
      if (row.sakAmount == null) continue;
      if (row.type === "buy") {
        events.push({ at: row.createdAt, delta: row.sakAmount });
      } else if (row.type === "sell") {
        events.push({ at: row.createdAt, delta: row.sakAmount.negated() });
      }
    }
    return events.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  async findGoldHistory(): Promise<Array<{ id: string; gramPriceUsd: import("@prisma/client").Prisma.Decimal; createdAt: Date }>> {
    return prisma.goldPriceHistory.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findSakConfigs(): Promise<Array<{ sakToGoldRatio: import("@prisma/client").Prisma.Decimal; effectiveFrom: Date }>> {
    return prisma.sakConfig.findMany({ orderBy: { effectiveFrom: "asc" } });
  }

  async findPayoutsByUser(userId: string): Promise<PerformancePayout[]> {
    const rows = await prisma.profitPayout.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        distributionId: true,
        holdingId: true,
        payoutUsd: true,
        payoutSak: true,
        ownershipPercent: true,
        status: true,
        createdAt: true,
        distribution: { select: { periodStart: true, periodEnd: true } },
        holding: {
          select: { land: { select: { titleAr: true } } },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      distributionId: row.distributionId,
      holdingId: row.holdingId,
      landTitleAr: row.holding?.land?.titleAr ?? null,
      periodStart: row.distribution.periodStart,
      periodEnd: row.distribution.periodEnd,
      payoutUsd: row.payoutUsd,
      payoutSak: row.payoutSak,
      ownershipPercent: row.ownershipPercent,
      status: row.status,
      createdAt: row.createdAt,
    }));
  }
}
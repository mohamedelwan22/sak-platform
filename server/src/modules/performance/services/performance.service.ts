import { Prisma } from "@prisma/client";
import { roundMoney } from "../../../lib/money.js";
import type { IPerformanceRepository } from "../interfaces/index.js";
import type {
  PerformanceAsset,
  PerformancePoint,
  PerformanceReport,
  PerformanceReturn,
  RealizedPeriod,
} from "../types/index.js";

const USD_DP = 2;
const SAK_DP = 4;

interface GoldPoint {
  id: string;
  gramPriceUsd: Prisma.Decimal;
  createdAt: Date;
}

interface SakConfigPoint {
  sakToGoldRatio: Prisma.Decimal;
  effectiveFrom: Date;
}

export class PerformanceService {
  constructor(private readonly performanceRepository: IPerformanceRepository) {}

  async getReport(userId: string): Promise<PerformanceReport> {
    const [holdings, events, goldHistory, sakConfigs, payouts] = await Promise.all([
      this.performanceRepository.findHoldingsByUser(userId),
      this.performanceRepository.findHoldingEventsByUser(userId),
      this.performanceRepository.findGoldHistory(),
      this.performanceRepository.findSakConfigs(),
      this.performanceRepository.findPayoutsByUser(userId),
    ]);

    const currentSakPrice = this.priceAt(goldHistory, sakConfigs, new Date());
    const latestGold = goldHistory.length > 0 ? goldHistory[goldHistory.length - 1] : null;

    const invested = holdings.reduce(
      (sum, h) => sum.add(h.sakOwned.mul(h.purchasePricePerSakUsd)),
      new Prisma.Decimal(0),
    );
    const totalSakOwned = holdings.reduce(
      (sum, h) => sum.add(h.sakOwned),
      new Prisma.Decimal(0),
    );
    const currentValue = currentSakPrice != null ? totalSakOwned.mul(currentSakPrice) : null;
    const unrealized = currentValue != null ? currentValue.sub(invested) : null;
    const totalProfit = unrealized;

    const completed = payouts.filter((p) => p.status === "completed");
    const realized = completed.reduce(
      (sum, p) => sum.add(p.payoutUsd),
      new Prisma.Decimal(0),
    );
    const pending = payouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum.add(p.payoutUsd), new Prisma.Decimal(0));

    const roiPercent = !invested.isZero()
      ? (unrealized != null ? unrealized.add(realized) : realized).div(invested).mul(100)
      : realized.isZero()
        ? new Prisma.Decimal(0)
        : null;

    const activeHoldings = holdings.filter((h) => h.status === "active").length;
    const maturedHoldings = holdings.filter((h) => h.status === "matured").length;

    const history = this.buildHistory({
      holdings,
      events,
      goldHistory,
      sakConfigs,
      currentSakPrice,
      totalSakOwned,
      currentValue,
      latestGold,
    });

    const returnsHistory = this.buildReturnsHistory(completed);
    const realizedByPeriod = this.buildRealizedByPeriod(completed);
    const breakdownAssets = this.buildBreakdown(holdings, currentSakPrice, completed);

    return {
      summary: {
        investedUsd: this.money(invested),
        currentValueUsd: currentValue != null ? this.money(currentValue) : null,
        unrealizedPnlUsd: unrealized != null ? this.money(unrealized) : null,
        realizedProfitUsd: this.money(realized),
        pendingPayoutUsd: this.money(pending),
        totalProfitUsd: totalProfit != null ? this.money(totalProfit) : null,
        roiPercent: roiPercent != null ? this.money(roiPercent) : null,
        totalSakOwned: this.sak(totalSakOwned),
        activeHoldings,
        maturedHoldings,
        sakPriceUsd: currentSakPrice != null ? this.money(currentSakPrice) : null,
        goldPriceUsd: latestGold != null ? this.money(latestGold.gramPriceUsd) : null,
        valuationDate: latestGold != null ? latestGold.createdAt.toISOString() : null,
      },
      performanceHistory: history.points,
      historyInsufficient: history.insufficient,
      returnsHistory,
      realizedByPeriod,
      breakdown: {
        totalSakOwned: this.sak(totalSakOwned),
        assets: breakdownAssets,
      },
    };
  }

  private buildHistory(input: {
    holdings: Awaited<ReturnType<IPerformanceRepository["findHoldingsByUser"]>>;
    events: Awaited<ReturnType<IPerformanceRepository["findHoldingEventsByUser"]>>;
    goldHistory: GoldPoint[];
    sakConfigs: SakConfigPoint[];
    currentSakPrice: Prisma.Decimal | null;
    totalSakOwned: Prisma.Decimal;
    currentValue: Prisma.Decimal | null;
    latestGold: GoldPoint | null;
  }): { points: PerformancePoint[]; insufficient: boolean } {
    const points: PerformancePoint[] = [];

    const investedSakAt = this.cumulativeEvents(input.events);

    for (const gold of input.goldHistory) {
      const price = this.priceAt(input.goldHistory, input.sakConfigs, gold.createdAt);
      if (price == null) continue;
      const investedSak = investedSakAt(gold.createdAt);
      if (investedSak.lte(0)) continue;
      points.push({
        date: gold.createdAt.toISOString(),
        goldPriceUsd: this.money(gold.gramPriceUsd),
        sakPriceUsd: this.money(price),
        investedSak: this.sak(investedSak),
        portfolioValueUsd: this.money(investedSak.mul(price)),
        isCurrent: false,
      });
    }

    const now = new Date();
    const isCurrent =
      points.length === 0 || points[points.length - 1].date !== now.toISOString();
    if (
      isCurrent &&
      input.totalSakOwned.gt(0) &&
      input.currentSakPrice != null &&
      input.currentValue != null
    ) {
      points.push({
        date: now.toISOString(),
        goldPriceUsd: input.latestGold != null ? this.money(input.latestGold.gramPriceUsd) : null,
        sakPriceUsd: this.money(input.currentSakPrice),
        investedSak: this.sak(input.totalSakOwned),
        portfolioValueUsd: this.money(input.currentValue),
        isCurrent: true,
      });
    }

    return { points, insufficient: points.length < 2 };
  }

  private buildReturnsHistory(
    payouts: Awaited<ReturnType<IPerformanceRepository["findPayoutsByUser"]>>,
  ): PerformanceReturn[] {
    return payouts.map((p) => ({
      id: p.id,
      distributionId: p.distributionId,
      holdingId: p.holdingId,
      landTitleAr: p.landTitleAr,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      payoutUsd: this.money(p.payoutUsd),
      payoutSak: this.sak(p.payoutSak),
      ownershipPercent: this.money(p.ownershipPercent),
      date: p.createdAt.toISOString(),
    }));
  }

  private buildRealizedByPeriod(
    payouts: Awaited<ReturnType<IPerformanceRepository["findPayoutsByUser"]>>,
  ): RealizedPeriod[] {
    const map = new Map<string, RealizedPeriod>();
    for (const p of payouts) {
      const key = `${p.periodStart.toISOString()}|${p.periodEnd.toISOString()}`;
      const existing = map.get(key);
      if (existing) {
        existing.payoutUsd = this.money(
          new Prisma.Decimal(existing.payoutUsd).add(p.payoutUsd),
        );
      } else {
        map.set(key, {
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          payoutUsd: this.money(p.payoutUsd),
        });
      }
    }
    return Array.from(map.values());
  }

  private buildBreakdown(
    holdings: Awaited<ReturnType<IPerformanceRepository["findHoldingsByUser"]>>,
    currentSakPrice: Prisma.Decimal | null,
    payouts: Awaited<ReturnType<IPerformanceRepository["findPayoutsByUser"]>>,
  ): PerformanceAsset[] {
    const holdingToLand = new Map(holdings.map((h) => [h.id, h.landId]));
    const realizedByLand = new Map<string, Prisma.Decimal>();
    for (const p of payouts) {
      if (!p.holdingId) continue;
      const landId = holdingToLand.get(p.holdingId);
      if (!landId) continue;
      realizedByLand.set(
        landId,
        (realizedByLand.get(landId) ?? new Prisma.Decimal(0)).add(p.payoutUsd),
      );
    }

    const map = new Map<string, PerformanceAsset>();

    for (const h of holdings) {
      let asset = map.get(h.landId);
      if (!asset) {
        asset = {
          landId: h.landId,
          titleAr: h.landTitleAr ?? "أصل",
          projectTitleAr: h.projectTitleAr,
          sakOwned: new Prisma.Decimal(0).toString(),
          investedUsd: new Prisma.Decimal(0).toString(),
          currentValueUsd: null,
          unrealizedPnlUsd: null,
          realizedUsd: new Prisma.Decimal(0).toString(),
        };
        map.set(h.landId, asset);
      }
      const sak = new Prisma.Decimal(asset.sakOwned).add(h.sakOwned);
      const invested = new Prisma.Decimal(asset.investedUsd).add(
        h.sakOwned.mul(h.purchasePricePerSakUsd),
      );
      asset.sakOwned = this.sak(sak);
      asset.investedUsd = this.money(invested);
    }

    const assets = Array.from(map.values()).map((asset) => {
      const sakOwned = new Prisma.Decimal(asset.sakOwned);
      const invested = new Prisma.Decimal(asset.investedUsd);
      const currentValue = currentSakPrice != null ? sakOwned.mul(currentSakPrice) : null;
      const realized = realizedByLand.get(asset.landId) ?? new Prisma.Decimal(0);
      return {
        ...asset,
        currentValueUsd: currentValue != null ? this.money(currentValue) : null,
        unrealizedPnlUsd:
          currentValue != null ? this.money(currentValue.sub(invested)) : null,
        realizedUsd: this.money(realized),
      };
    });

    assets.sort((a, b) => Number(b.currentValueUsd ?? 0) - Number(a.currentValueUsd ?? 0));
    return assets;
  }

  private cumulativeEvents(
    events: Awaited<ReturnType<IPerformanceRepository["findHoldingEventsByUser"]>>,
  ): (at: Date) => Prisma.Decimal {
    const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
    const prefix: Prisma.Decimal[] = [];
    let running = new Prisma.Decimal(0);
    for (const e of sorted) {
      running = running.add(e.delta);
      prefix.push(running);
    }
    return (at) => {
      let lo = 0;
      let hi = sorted.length - 1;
      let result = new Prisma.Decimal(0);
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid].at.getTime() <= at.getTime()) {
          result = prefix[mid];
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    };
  }

  private priceAt(
    goldHistory: GoldPoint[],
    sakConfigs: SakConfigPoint[],
    at: Date,
  ): Prisma.Decimal | null {
    const gold = this.lastAt(goldHistory, at);
    const config = this.lastAt(sakConfigs, at);
    if (!gold || !config) return null;
    return gold.gramPriceUsd.mul(config.sakToGoldRatio);
  }

  private lastAt<T extends { effectiveFrom?: Date; createdAt?: Date }>(
    items: T[],
    at: Date,
  ): T | null {
    const key = (item: T): number => {
      const date = (item as { effectiveFrom?: Date }).effectiveFrom ?? (item as { createdAt?: Date }).createdAt;
      return date?.getTime() ?? 0;
    };
    let lo = 0;
    let hi = items.length - 1;
    let result: T | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (key(items[mid]) <= at.getTime()) {
        result = items[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }

  private money(v: Prisma.Decimal | string): string {
    return roundMoney(v, USD_DP).toFixed(USD_DP);
  }

  private sak(v: Prisma.Decimal | string): string {
    return roundMoney(v, SAK_DP).toFixed(SAK_DP);
  }
}
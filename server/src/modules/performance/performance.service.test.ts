import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { PerformanceService } from "./services/performance.service.js";
import { PerformanceRepository } from "./repositories/performance.repository.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

let uidA = "";
let uidB = "";
let projectId = "";
let landId = "";
const createdGoldIds: string[] = [];
const createdSakConfigIds: string[] = [];
const createdDistributionIds: string[] = [];

describeDb("Performance (integration)", () => {
  let service: PerformanceService;

  beforeEach(async () => {
    service = new PerformanceService(new PerformanceRepository());
    uidA = await createTestUser("perf-a");
    uidB = await createTestUser("perf-b");

    const project = await prisma.project.create({
      data: {
        titleEn: "Performance Test Project",
        titleAr: "مشروع اختبار الأداء",
        country: "Egypt",
        city: "Cairo",
        status: "active",
        riskLevel: "medium",
        expectedRoi: new Prisma.Decimal("12"),
      },
    });
    projectId = project.id;

    const land = await prisma.land.create({
      data: {
        titleEn: "Performance Test Land",
        titleAr: "أرض اختبار الأداء",
        country: "Egypt",
        city: "Cairo",
        projectId,
        assetType: "residential",
        status: "active",
        riskLevel: "low",
        expectedRoi: new Prisma.Decimal("12"),
        areaM2: new Prisma.Decimal("1000"),
        maturityMonths: 12,
        totalSakInventory: new Prisma.Decimal("1000"),
        availableSak: new Prisma.Decimal("1000"),
      },
    });
    landId = land.id;
  });

  afterEach(async () => {
    await prisma.profitPayout.deleteMany({
      where: { user: { id: { in: [uidA, uidB] } } },
    });
    await prisma.profitDistribution.deleteMany({
      where: { id: { in: createdDistributionIds } },
    });
    await prisma.transaction.deleteMany({ where: { holding: { userId: { in: [uidA, uidB] } } } });
    await prisma.holding.deleteMany({ where: { userId: { in: [uidA, uidB] } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [uidA, uidB] } } });
    await prisma.land.deleteMany({ where: { id: landId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { id: { in: [uidA, uidB] } } });
    if (createdGoldIds.length) {
      await prisma.goldPriceHistory.deleteMany({ where: { id: { in: createdGoldIds } } });
      createdGoldIds.length = 0;
    }
    if (createdSakConfigIds.length) {
      await prisma.sakConfig.deleteMany({ where: { id: { in: createdSakConfigIds } } });
      createdSakConfigIds.length = 0;
    }
    createdDistributionIds.length = 0;
  });

  it("returns a zeroed report for an investor without holdings or payouts", async () => {
    const report = await service.getReport(uidA);

    expect(report.summary.investedUsd).toBe("0.00");
    expect(report.summary.currentValueUsd).toBe("0.00");
    expect(report.summary.realizedProfitUsd).toBe("0.00");
    expect(report.summary.pendingPayoutUsd).toBe("0.00");
    expect(report.summary.roiPercent).toBe("0.00");
    expect(report.summary.totalSakOwned).toBe("0.0000");
    expect(report.summary.activeHoldings).toBe(0);
    expect(report.summary.maturedHoldings).toBe(0);
    expect(report.performanceHistory).toEqual([]);
    expect(report.historyInsufficient).toBe(true);
    expect(report.returnsHistory).toEqual([]);
    expect(report.realizedByPeriod).toEqual([]);
    expect(report.breakdown.assets).toEqual([]);
  });

  it("computes invested, current value, unrealized P/L and ROI from live price without float drift", async () => {
    await price(100);
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("0.3"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.1"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    });
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("0.4"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.1"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "matured",
        createdAt: new Date("2026-01-03T00:00:00Z"),
      },
    });

    const live = await resolveLivePrice();
    const expectedCurrentValue = round2(Number(new Prisma.Decimal("0.7").mul(live)));
    const expectedUnrealized = round2(expectedCurrentValue - 0.07);
    const expectedRoi = round2((expectedUnrealized / 0.07) * 100);

    const report = await service.getReport(uidA);

    expect(report.summary.investedUsd).toBe("0.07");
    expect(report.summary.totalSakOwned).toBe("0.7000");
    expect(report.summary.currentValueUsd).toBe(expectedCurrentValue.toFixed(2));
    expect(report.summary.unrealizedPnlUsd).toBe(expectedUnrealized.toFixed(2));
    expect(report.summary.roiPercent).toBe(expectedRoi.toFixed(2));
    expect(report.summary.sakPriceUsd).toBe(live.toFixed(2));
    expect(report.summary.activeHoldings).toBe(1);
    expect(report.summary.maturedHoldings).toBe(1);
  });

  it("counts only completed payouts as realized profit and reports pending separately", async () => {
    await price(100, new Date("2026-01-01T00:00:00Z"));
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    const holding = await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    });

    const distributionId = await createDistribution("2026-01-01", "2026-01-31");
    await createPayout(distributionId, uidA, holding.id, "500", "pending");
    await createPayout(distributionId, uidA, holding.id, "400", "completed");
    await createPayout(distributionId, uidA, holding.id, "100", "completed");

    const report = await service.getReport(uidA);

    expect(report.summary.realizedProfitUsd).toBe("500.00");
    expect(report.summary.pendingPayoutUsd).toBe("500.00");
    expect(report.returnsHistory).toHaveLength(2);
    expect(report.realizedByPeriod).toHaveLength(1);
    expect(report.realizedByPeriod[0].payoutUsd).toBe("500.00");
    const byLand = report.breakdown.assets[0];
    expect(byLand.realizedUsd).toBe("500.00");
  });

  it("reconstructs historical portfolio value from holding accrual dates and gold feed points", async () => {
    await price(100, new Date("2026-07-05T00:00:00Z"));
    await price(150, new Date("2026-07-20T00:00:00Z"));
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    const holding = await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("15"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
        createdAt: new Date("2026-07-01T00:00:00Z"),
      },
    });
    await prisma.wallet.create({
      data: { userId: uidA, balance: new Prisma.Decimal("0"), frozenBalance: new Prisma.Decimal("0") },
    });
    await buyTransaction(uidA, holding.id, "10", new Date("2026-07-01T00:00:00Z"));
    await buyTransaction(uidA, holding.id, "5", new Date("2026-07-10T00:00:00Z"));

    const report = await service.getReport(uidA);

    expect(report.historyInsufficient).toBe(false);
    const points = report.performanceHistory;
    expect(points.length).toBeGreaterThanOrEqual(3);

    const first = points.find((p) => p.date === "2026-07-05T00:00:00.000Z");
    expect(first).toBeDefined();
    expect(first!.investedSak).toBe("10.0000");
    expect(first!.portfolioValueUsd).toBe("100.00");

    const second = points.find((p) => p.date === "2026-07-20T00:00:00.000Z");
    expect(second).toBeDefined();
    expect(second!.investedSak).toBe("15.0000");
    expect(second!.portfolioValueUsd).toBe("225.00");

    const last = points[points.length - 1];
    expect(last.isCurrent).toBe(true);
    expect(last.investedSak).toBe("15.0000");
    expect(last.portfolioValueUsd).not.toBeNull();
  });

  it("marks history as insufficient when fewer than two usable valuation points exist", async () => {
    await price(100, new Date("2026-07-05T00:00:00Z"));
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
        createdAt: new Date("2026-07-10T00:00:00Z"),
      },
    });

    const report = await service.getReport(uidA);
    expect(report.historyInsufficient).toBe(true);
    expect(report.performanceHistory.length).toBeGreaterThan(0);
  });

  it("returns a null ROI when invested is zero but realized profit exists", async () => {
    await price(100, new Date("2026-01-01T00:00:00Z"));
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    const holding = await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    });

    const distributionId = await createDistribution("2026-01-01", "2026-01-31");
    await createPayout(distributionId, uidA, holding.id, "250", "completed");

    await prisma.holding.update({
      where: { id: holding.id },
      data: { sakOwned: new Prisma.Decimal("0") },
    });

    const report = await service.getReport(uidA);
    expect(report.summary.investedUsd).toBe("0.00");
    expect(report.summary.realizedProfitUsd).toBe("250.00");
    expect(report.summary.roiPercent).toBeNull();
  });

  it("never exposes another investor's holdings or payouts", async () => {
    await price(100, new Date("2026-01-01T00:00:00Z"));
    await config(0.1, new Date("2020-01-01T00:00:00Z"));

    const holdingA = await prisma.holding.create({
      data: {
        userId: uidA,
        landId,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
      },
    });
    await prisma.holding.create({
      data: {
        userId: uidB,
        landId,
        sakOwned: new Prisma.Decimal("77"),
        purchasePricePerSakUsd: new Prisma.Decimal("10"),
        maturityDate: new Date("2027-01-01T00:00:00Z"),
        status: "active",
      },
    });

    const distributionId = await createDistribution("2026-01-01", "2026-01-31");
    await createPayout(distributionId, uidA, holdingA.id, "300", "completed");

    const [reportA, reportB] = await Promise.all([
      service.getReport(uidA),
      service.getReport(uidB),
    ]);

    expect(reportA.summary.totalSakOwned).toBe("10.0000");
    expect(reportB.summary.totalSakOwned).toBe("77.0000");
    expect(reportA.summary.realizedProfitUsd).toBe("300.00");
    expect(reportB.summary.realizedProfitUsd).toBe("0.00");
  });
});

async function createTestUser(prefix: string): Promise<string> {
  let role = await prisma.role.findUnique({ where: { name: "investor" } });
  if (!role) {
    role = await prisma.role.create({ data: { name: "investor", description: "test fixture" } });
  }
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const user = await prisma.user.create({
    data: {
      email: `sak-perf-${prefix}-${suffix}@sak100.invalid`,
      accountNumber: `8${suffix.slice(-8)}`,
      firstName: "Perf",
      lastName: "Vision",
      roleId: role.id,
      status: "active",
      emailVerified: true,
      createdAt: new Date("2020-01-01T00:00:00Z"),
    },
  });
  return user.id;
}

async function price(gramPriceUsd: number, createdAt?: Date): Promise<void> {
  const gold = await prisma.goldPriceHistory.create({
    data: { gramPriceUsd: new Prisma.Decimal(String(gramPriceUsd)), createdAt: createdAt ?? new Date() },
  });
  createdGoldIds.push(gold.id);
}

async function resolveLivePrice(): Promise<Prisma.Decimal> {
  const gold = await prisma.goldPriceHistory.findFirst({ orderBy: { createdAt: "desc" } });
  const cfg = await prisma.sakConfig.findFirst({
    where: { effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!gold || !cfg) throw new Error("price unavailable");
  return gold.gramPriceUsd.mul(cfg.sakToGoldRatio);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function config(sakToGoldRatio: number, effectiveFrom: Date): Promise<void> {
  const row = await prisma.sakConfig.create({
    data: {
      sakToGoldRatio: new Prisma.Decimal(String(sakToGoldRatio)),
      sellFeePercent: new Prisma.Decimal("2"),
      effectiveFrom,
    },
  });
  createdSakConfigIds.push(row.id);
}

async function buyTransaction(
  userId: string,
  holdingId: string,
  sakAmount: string,
  createdAt: Date,
): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("wallet missing");
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: "buy",
      amount: new Prisma.Decimal(sakAmount),
      status: "completed",
      direction: "debit",
      unit: "SAK",
      usdAmount: new Prisma.Decimal("0"),
      sakAmount: new Prisma.Decimal(sakAmount),
      pricePerSakUsd: new Prisma.Decimal("10"),
      holdingId,
      createdAt,
    },
  });
}

async function createDistribution(periodStart: string, periodEnd: string): Promise<string> {
  const distribution = await prisma.profitDistribution.create({
    data: {
      landId,
      totalProfitUsd: new Prisma.Decimal("1000"),
      periodStart: new Date(`${periodStart}T00:00:00Z`),
      periodEnd: new Date(`${periodEnd}T23:59:59Z`),
      distributedBy: uidA,
      distributedAt: new Date("2026-01-15T00:00:00Z"),
    },
  });
  createdDistributionIds.push(distribution.id);
  return distribution.id;
}

async function createPayout(
  distributionId: string,
  userId: string,
  holdingId: string,
  payoutUsd: string,
  status: "pending" | "completed" | "failed",
): Promise<void> {
  await prisma.profitPayout.create({
    data: {
      distributionId,
      userId,
      holdingId,
      ownershipPercent: new Prisma.Decimal("10"),
      payoutUsd: new Prisma.Decimal(payoutUsd),
      payoutSak: new Prisma.Decimal("0"),
      status,
    },
  });
}
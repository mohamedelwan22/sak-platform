import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { resolveCurrentSakPrice } from "../../../services/pricing.service.js";
import { HoldingService } from "./holdings.service.js";
import { HoldingRepository } from "../repositories/holdings.repository.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb("Real Assets (integration)", () => {
  let service: HoldingService;
  let uidA: string;
  let uidB: string;
  let projectId: string;
  let landA: { id: string; titleAr: string; country: string; city: string };
  let landB: { id: string; titleAr: string; country: string; city: string };
  let landC: { id: string; titleAr: string; country: string; city: string };
  let goldPriceId: string;
  let sakConfigId: string | null = null;

  beforeEach(async () => {
    service = new HoldingService(new HoldingRepository());
    uidA = await createTestUser();
    uidB = await createTestUser();

    const gold = await prisma.goldPriceHistory.create({
      data: { gramPriceUsd: new Prisma.Decimal("100") },
    });
    goldPriceId = gold.id;

    const configCount = await prisma.sakConfig.count();
    if (configCount === 0) {
      const config = await prisma.sakConfig.create({
        data: {
          sakToGoldRatio: new Prisma.Decimal("0.01"),
          sellFeePercent: new Prisma.Decimal("2.0"),
          effectiveFrom: new Date("2020-01-01T00:00:00Z"),
        },
      });
      sakConfigId = config.id;
    }

    const project = await prisma.project.create({
      data: {
        titleEn: "Real Assets Test Project",
        titleAr: "مشروع اختبار الأصول الحقيقية",
        country: "Egypt",
        city: "Cairo",
        status: "active",
        riskLevel: "medium",
        expectedRoi: new Prisma.Decimal("15.5"),
      },
    });
    projectId = project.id;

    landA = await createLand({
      titleEn: "Agricultural Land A",
      titleAr: "قطعة أرض زراعية أ",
      projectId,
      assetType: "agricultural",
      status: "active",
      riskLevel: "low",
      expectedRoi: "12",
      areaM2: "10000",
      lat: "30.04",
      lng: "31.23",
    });

    landB = await createLand({
      titleEn: "Residential Land B",
      titleAr: "قطعة أرض سكنية ب",
      projectId: null,
      assetType: "residential",
      status: "partially_sold",
      riskLevel: "high",
      expectedRoi: "18",
      areaM2: "5000",
    });

    landC = await createLand({
      titleEn: "Investor B Land C",
      titleAr: "أرض المستثمر ب",
      projectId: null,
      assetType: "commercial",
      status: "active",
      riskLevel: "low",
      expectedRoi: "10",
      areaM2: "2000",
    });
  });

  afterEach(async () => {
    await prisma.holding.deleteMany({ where: { userId: { in: [uidA, uidB] } } });
    await prisma.land.deleteMany({ where: { id: { in: [landA.id, landB.id, landC.id] } } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { id: { in: [uidA, uidB] } } });
    await prisma.goldPriceHistory.deleteMany({ where: { id: goldPriceId } });
    if (sakConfigId) {
      await prisma.sakConfig.deleteMany({ where: { id: sakConfigId } });
    }
  });

  it("returns the investor's real assets joined with land and project data", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landA.id,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });

    const result = await service.getRealAssets(uidA);

    expect(result.assets).toHaveLength(1);
    const asset = result.assets[0];
    expect(asset.landId).toBe(landA.id);
    expect(asset.landTitleAr).toBe(landA.titleAr);
    expect(asset.landTitleEn).toBe("Agricultural Land A");
    expect(asset.assetType).toBe("agricultural");
    expect(asset.country).toBe(landA.country);
    expect(asset.city).toBe(landA.city);
    expect(asset.areaM2).toBe(10000);
    expect(asset.lat).toBe(30.04);
    expect(asset.lng).toBe(31.23);
    expect(asset.landStatus).toBe("active");
    expect(asset.riskLevel).toBe("low");
    expect(asset.expectedRoi).toBe(12);
    expect(asset.project).not.toBeNull();
    expect(asset.project!.titleAr).toBe("مشروع اختبار الأصول الحقيقية");
    expect(asset.project!.country).toBe("Egypt");
    expect(asset.sakOwned).toBe(10);
    expect(asset.holdings).toHaveLength(1);
    expect(asset.holdings[0].status).toBe("active");
  });

  it("groups multiple holdings on one land and links the related project", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landA.id,
        sakOwned: new Prisma.Decimal("5"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landA.id,
        sakOwned: new Prisma.Decimal("3"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.6"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });

    const result = await service.getRealAssets(uidA);

    expect(result.assets).toHaveLength(1);
    const asset = result.assets[0];
    expect(asset.sakOwned).toBe(8);
    expect(asset.totalCostUsd).toBeCloseTo(5 * 0.5 + 3 * 0.6, 6);
    expect(asset.averagePurchasePriceUsd).toBeCloseTo((5 * 0.5 + 3 * 0.6) / 8, 6);
    expect(asset.holdings).toHaveLength(2);
  });

  it("computes the current asset value from the live gold-backed SAK price, not the purchase price", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landB.id,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });

    const [result, livePrice] = await Promise.all([
      service.getRealAssets(uidA),
      resolveCurrentSakPrice(prisma),
    ]);

    const currentSakPrice = Number(livePrice!);
    expect(result.sakPriceUsd).toBe(currentSakPrice);
    expect(result.assets[0].currentValueUsd).toBe(10 * currentSakPrice);
    expect(result.totalValueUsd).toBe(10 * currentSakPrice);
    expect(result.valuationDate).toBeInstanceOf(Date);
    expect(Date.now() - result.valuationDate!.getTime()).toBeLessThan(5000);
  });

  it("computes allocation percentages summing to ~100 across the investor's assets", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landA.id,
        sakOwned: new Prisma.Decimal("6"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landB.id,
        sakOwned: new Prisma.Decimal("4"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "matured",
      },
    });

    const result = await service.getRealAssets(uidA);

    expect(result.assets).toHaveLength(2);
    expect(result.totalSakOwned).toBe(10);
    const totalPct = result.assets.reduce((s, a) => s + a.allocationPercent, 0);
    expect(totalPct).toBeCloseTo(100, 6);
    const byLand = Object.fromEntries(result.assets.map((a) => [a.landId, a]));
    expect(byLand[landA.id].allocationPercent).toBeCloseTo(60, 6);
    expect(byLand[landB.id].allocationPercent).toBeCloseTo(40, 6);
  });

  it("returns an empty asset list for an investor without holdings", async () => {
    const result = await service.getRealAssets(uidA);
    expect(result.assets).toEqual([]);
    expect(result.totalSakOwned).toBe(0);
    expect(result.totalValueUsd).toBe(null);
  });

  it("never exposes another investor's assets", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landA.id,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });
    await prisma.holding.create({
      data: {
        userId: uidB,
        landId: landC.id,
        sakOwned: new Prisma.Decimal("7"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });

    const [resultA, resultB] = await Promise.all([
      service.getRealAssets(uidA),
      service.getRealAssets(uidB),
    ]);

    expect(resultA.assets.map((a) => a.landId)).toEqual([landA.id]);
    expect(resultB.assets.map((a) => a.landId)).toEqual([landC.id]);
  });

  it("handles an unlinked land without a related project", async () => {
    await prisma.holding.create({
      data: {
        userId: uidA,
        landId: landB.id,
        sakOwned: new Prisma.Decimal("3"),
        purchasePricePerSakUsd: new Prisma.Decimal("0.5"),
        maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        status: "active",
      },
    });

    const result = await service.getRealAssets(uidA);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].project).toBeNull();
  });
});

async function createTestUser(): Promise<string> {
  let role = await prisma.role.findUnique({ where: { name: "investor" } });
  if (!role) {
    role = await prisma.role.create({ data: { name: "investor", description: "test fixture" } });
  }
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const user = await prisma.user.create({
    data: {
      email: `sak-reala-asset-${suffix}@sak100.invalid`,
      accountNumber: `7${suffix.slice(-8)}`,
      firstName: "Real",
      lastName: "Asset",
      roleId: role.id,
      status: "active",
      emailVerified: true,
    },
  });
  return user.id;
}

async function createLand(input: {
  titleEn: string;
  titleAr: string;
  projectId: string | null;
  assetType: string;
  status: string;
  riskLevel: string;
  expectedRoi: string;
  areaM2: string;
  lat?: string;
  lng?: string;
}): Promise<{ id: string; titleAr: string; country: string; city: string }> {
  const land = await prisma.land.create({
    data: {
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      country: "Egypt",
      city: "Cairo",
      projectId: input.projectId,
      assetType: input.assetType,
      status: input.status,
      riskLevel: input.riskLevel,
      expectedRoi: new Prisma.Decimal(input.expectedRoi),
      areaM2: new Prisma.Decimal(input.areaM2),
      maturityMonths: 12,
      totalSakInventory: new Prisma.Decimal("1000"),
      availableSak: new Prisma.Decimal("1000"),
      ...(input.lat ? { lat: new Prisma.Decimal(input.lat) } : {}),
      ...(input.lng ? { lng: new Prisma.Decimal(input.lng) } : {}),
    },
  });
  return { id: land.id, titleAr: land.titleAr, country: land.country, city: land.city };
}
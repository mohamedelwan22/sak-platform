import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { MarketplaceService } from "./marketplace.service.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb("MarketplaceService (integration)", () => {
  let service: MarketplaceService;
  let userId: string;
  let landId: string;
  let goldPriceId: string;
  let sakConfigId: string | null;

  beforeEach(async () => {
    service = new MarketplaceService();
    userId = await createTestUser();

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
    } else {
      sakConfigId = null;
    }

    const land = await prisma.land.create({
      data: {
        titleEn: "Test Land",
        titleAr: "أرض اختبار",
        country: "EG",
        city: "Cairo",
        totalSakInventory: new Prisma.Decimal("100"),
        availableSak: new Prisma.Decimal("100"),
        maturityMonths: 12,
        status: "active",
      },
    });
    landId = land.id;
  });

  afterEach(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { holding: { userId } } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.holding.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.goldPriceHistory.deleteMany({ where: { id: goldPriceId } });
    if (sakConfigId) {
      await prisma.sakConfig.deleteMany({ where: { id: sakConfigId } });
    }
    await prisma.land.deleteMany({ where: { id: landId } });
  });

  it("buys SAK instantly, records a completed buy order linked to the transaction, and decrements land inventory", async () => {
    await prisma.wallet.create({
      data: { userId, balance: new Prisma.Decimal("1000"), frozenBalance: new Prisma.Decimal("0") },
    });

    const result = await service.buySak(userId, { landId, sakAmount: 10 });

    const order = result.order as {
      id: string;
      type: string;
      status: string;
      transactionId: string;
    };
    expect(order.type).toBe("buy");
    expect(order.status).toBe("completed");

    const freshOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(freshOrder).not.toBeNull();
    expect(freshOrder!.transactionId).toBe(order.transactionId);

    const transaction = await prisma.transaction.findUnique({
      where: { id: order.transactionId },
    });
    expect(transaction).not.toBeNull();
    expect(transaction!.type).toBe("buy");
    expect(transaction!.direction).toBe("debit");
    expect(transaction!.status).toBe("completed");
    expect(transaction!.amount.toString()).toBe("10");

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    expect(wallet!.balance.toString()).toBe("990");

    const land = await prisma.land.findUnique({ where: { id: landId } });
    expect(land!.availableSak.toString()).toBe("90");
    expect(land!.status).toBe("partially_sold");

    const holding = await prisma.holding.findFirst({ where: { userId } });
    expect(holding).not.toBeNull();
    expect(holding!.sakOwned.toString()).toBe("10");
  });

  it("rejects a buy when the wallet has no available balance", async () => {
    await prisma.wallet.create({
      data: { userId, balance: new Prisma.Decimal("5"), frozenBalance: new Prisma.Decimal("0") },
    });

    await expect(service.buySak(userId, { landId, sakAmount: 10 })).rejects.toMatchObject({
      statusCode: 400,
      code: "INSUFFICIENT_BALANCE",
    });
  });

  it("rejects a buy when land inventory is insufficient", async () => {
    await prisma.wallet.create({
      data: { userId, balance: new Prisma.Decimal("1000"), frozenBalance: new Prisma.Decimal("0") },
    });
    await prisma.land.update({
      where: { id: landId },
      data: { availableSak: new Prisma.Decimal("3") },
    });

    await expect(service.buySak(userId, { landId, sakAmount: 10 })).rejects.toMatchObject({
      statusCode: 400,
      code: "INSUFFICIENT_INVENTORY",
    });
  });

  it("lists only the investor's own orders", async () => {
    await prisma.wallet.create({
      data: { userId, balance: new Prisma.Decimal("1000"), frozenBalance: new Prisma.Decimal("0") },
    });
    await service.buySak(userId, { landId, sakAmount: 5 });

    const page = await service.getMyOrders(userId, {});
    expect(page.data).toHaveLength(1);
    expect(page.data[0].type).toBe("buy");
    expect(page.total).toBe(1);

    const other = await createTestUser();
    const empty = await service.getMyOrders(other, {});
    expect(empty.data).toHaveLength(0);
    await prisma.user.deleteMany({ where: { id: other } });
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
      email: `sak-market-${suffix}@sak100.invalid`,
      accountNumber: `7${suffix.slice(-8)}`,
      firstName: "Test",
      lastName: "User",
      roleId: role.id,
      status: "active",
      emailVerified: true,
    },
  });
  return user.id;
}

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { toDecimal } from "../../../lib/money.js";
import {
  resolveCurrentSakConfig,
  resolveCurrentSakPrice,
} from "../../../services/pricing.service.js";
import { PaymentAccountingService } from "./payment-accounting.service.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../lib/errors.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb("PaymentAccountingService (integration)", () => {
  let service: PaymentAccountingService;
  let userId: string;
  let reviewerId: string;
  let goldPriceId: string;
  let sakConfigId: string | null;
  let price: Prisma.Decimal;

  beforeEach(async () => {
    service = new PaymentAccountingService(prisma);
    userId = await createTestUser();
    reviewerId = userId;

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

    const resolved = await resolveCurrentSakPrice(prisma);
    if (!resolved) throw new Error("SAK price unavailable for test setup");
    price = resolved;
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany({ where: { paymentRequest: { userId } } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.paymentRequest.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.goldPriceHistory.deleteMany({ where: { id: goldPriceId } });
    if (sakConfigId) {
      await prisma.sakConfig.deleteMany({ where: { id: sakConfigId } });
    }
  });

  describe("createPaymentRequest", () => {
    it("creates a pending deposit without touching the wallet", async () => {
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
        currency: "USD",
        method: "bank_transfer",
      });

      expect(request.status).toBe("pending");
      expect(request.type).toBe("deposit");
      expect(request.amount.toString()).toBe("100");
      expect(request.currency).toBe("USD");

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet).toBeNull();
    });

    it("creates a withdrawal, freezes SAK and records the rate used at request time", async () => {
      await seedWalletBalance(userId, "1000");
      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
        currency: "USD",
      });

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet).not.toBeNull();
      const expectedReserved = ceilSak(toDecimal("50").div(price));
      expect(wallet!.frozenBalance.equals(expectedReserved)).toBe(true);
      expect(wallet!.balance.toString()).toBe("1000");

      expect(request.status).toBe("pending");
      expect(request.sakAmount).not.toBeNull();
      expect(request!.sakAmount!.equals(expectedReserved)).toBe(true);
      expect(request.rateUsedAtRequest).not.toBeNull();
      expect(request.rateUsedAtRequest!.equals(price)).toBe(true);
    });

    it("rejects withdrawal with insufficient available balance", async () => {
      await seedWalletBalance(userId, "10");
      // reserved = ceil(amount / price) = 20 SAK > 10 SAK available
      const amount = price.mul(20).toString();
      await expect(
        service.createPaymentRequest({ userId, type: "withdrawal", amount }),
      ).rejects.toMatchObject({ statusCode: 400, code: "INSUFFICIENT_BALANCE" });
    });

    it("treats frozen SAK as unavailable when checking withdrawal capacity", async () => {
      await seedWalletBalance(userId, "1000", "980");
      // available = 1000 - 980 = 20 SAK; reserved = 30 SAK
      const amount = price.mul(30).toString();
      await expect(
        service.createPaymentRequest({ userId, type: "withdrawal", amount }),
      ).rejects.toMatchObject({ statusCode: 400, code: "INSUFFICIENT_BALANCE" });

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet!.frozenBalance.toString()).toBe("980");
    });

    it("rejects zero, negative and malformed amounts", async () => {
      for (const bad of ["0", "-5", "abc"]) {
        await expect(
          service.createPaymentRequest({ userId, type: "deposit", amount: bad }),
        ).rejects.toBeInstanceOf(ValidationError);
      }
    });

    it("does not create a wallet when a withdrawal request itself fails validation", async () => {
      await seedWalletBalance(userId, "1000");
      await expect(
        service.createPaymentRequest({ userId, type: "withdrawal", amount: "-10" }),
      ).rejects.toBeInstanceOf(ValidationError);

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet!.frozenBalance.toString()).toBe("0");
    });
  });

  describe("approvePaymentRequest", () => {
    it("credits SAK for deposits at the current price and records the full transaction", async () => {
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });

      const approved = await service.approvePaymentRequest(request.id, reviewerId);

      expect(approved.status).toBe("approved");

      const expectedCredit = floorSak(toDecimal("100").div(price));
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet).not.toBeNull();
      expect(wallet!.balance.equals(expectedCredit)).toBe(true);
      expect(wallet!.frozenBalance.toString()).toBe("0");

      const txns = await prisma.transaction.findMany({ where: { paymentRequestId: request.id } });
      expect(txns).toHaveLength(1);
      const t = txns[0];
      expect(t.type).toBe("deposit");
      expect(t.direction).toBe("credit");
      expect(t.unit).toBe("SAK");
      expect(t.status).toBe("completed");
      expect(t.amount.equals(expectedCredit)).toBe(true);
      expect(t.usdAmount!.equals(toDecimal("100"))).toBe(true);
      expect(t.sakAmount!.equals(expectedCredit)).toBe(true);
      expect(t.pricePerSakUsd!.equals(price)).toBe(true);
      expect(t.approvedById).toBe(reviewerId);
    });

    it("is idempotent — a second approve throws and does not double-credit", async () => {
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });
      await service.approvePaymentRequest(request.id, reviewerId);
      const afterFirst = (await prisma.wallet.findUnique({ where: { userId } }))!;

      await expect(service.approvePaymentRequest(request.id, reviewerId)).rejects.toBeInstanceOf(
        ConflictError,
      );

      const afterSecond = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(afterSecond.balance.equals(afterFirst.balance)).toBe(true);
      expect(await prisma.transaction.count({ where: { paymentRequestId: request.id } })).toBe(1);
    });

    it("debits SAK exactly once for withdrawals and releases the freeze", async () => {
      await seedWalletBalance(userId, "1000");
      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
      });
      const reserved = reservedOf(request.sakAmount!);

      await service.approvePaymentRequest(request.id, reviewerId);

      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.balance.equals(toDecimal("1000").minus(reserved))).toBe(true);
      expect(wallet.frozenBalance.toString()).toBe("0");

      const txns = await prisma.transaction.findMany({ where: { paymentRequestId: request.id } });
      expect(txns).toHaveLength(1);
      expect(txns[0].type).toBe("withdrawal");
      expect(txns[0].direction).toBe("debit");
      expect(txns[0].amount.equals(reserved)).toBe(true);
      expect(txns[0].usdAmount!.equals(toDecimal("50"))).toBe(true);
      expect(txns[0].pricePerSakUsd!.equals(price)).toBe(true);
    });

    it("throws NotFoundError for an unknown id", async () => {
      await expect(
        service.approvePaymentRequest("00000000-0000-0000-0000-000000000000", reviewerId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws ConflictError when approving an already-rejected request", async () => {
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });
      await service.rejectPaymentRequest(request.id, reviewerId, "not needed");
      await expect(service.approvePaymentRequest(request.id, reviewerId)).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe("rejectPaymentRequest", () => {
    it("releases frozen SAK for withdrawals without touching balance", async () => {
      await seedWalletBalance(userId, "1000");
      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
      });
      const reserved = reservedOf(request.sakAmount!);

      const rejected = await service.rejectPaymentRequest(request.id, reviewerId, "policy");

      expect(rejected.status).toBe("rejected");
      expect(rejected.rejectionReason).toBe("policy");

      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.balance.toString()).toBe("1000");
      expect(wallet.frozenBalance.toString()).toBe("0");

      const txns = await prisma.transaction.findMany({ where: { paymentRequestId: request.id } });
      expect(txns).toHaveLength(1);
      expect(txns[0].status).toBe("rejected");
      expect(txns[0].direction).toBe("credit");
      expect(txns[0].amount.equals(reserved)).toBe(true);
    });

    it("does not change the wallet for deposit rejections", async () => {
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });
      const rejected = await service.rejectPaymentRequest(request.id, reviewerId);

      expect(rejected.status).toBe("rejected");
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      expect(wallet).toBeNull();
    });

    it("is idempotent — a second reject throws and wallet stays released", async () => {
      await seedWalletBalance(userId, "1000");
      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
      });
      await service.rejectPaymentRequest(request.id, reviewerId);

      await expect(service.rejectPaymentRequest(request.id, reviewerId)).rejects.toBeInstanceOf(
        ConflictError,
      );

      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.frozenBalance.toString()).toBe("0");
      expect(wallet.balance.toString()).toBe("1000");
    });
  });

  describe("createSellRequest", () => {
    it("creates a sell order and matching withdrawal request, freezing exactly the SAK quantity", async () => {
      await seedWalletBalance(userId, "1000");
      const qty = new Prisma.Decimal("20");

      const result = await service.createSellRequest({ userId, sakAmount: "20" });

      const order = result.order as { id: string; status: string };
      expect(order.status).toBe("pending");

      const config = await resolveCurrentSakConfig(prisma);
      if (!config) throw new Error("SAK config unavailable for test");
      const feePercent = toDecimal(config.sellFeePercent).div(100);
      const expectedFeeSak = qty.mul(feePercent).toDecimalPlaces(4);
      const expectedSubtotal = qty.mul(price);
      const expectedProceeds = expectedSubtotal.minus(expectedFeeSak.mul(price)).toDecimalPlaces(8);

      const freshOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(freshOrder).not.toBeNull();
      expect(freshOrder!.type).toBe("sell");
      expect(freshOrder!.sakQuantity.equals(qty)).toBe(true);
      expect(freshOrder!.feeSak.equals(expectedFeeSak)).toBe(true);
      expect(freshOrder!.subtotalUsd.equals(expectedSubtotal)).toBe(true);
      expect(freshOrder!.totalUsd.equals(expectedProceeds)).toBe(true);

      const request = await prisma.paymentRequest.findUnique({
        where: { id: result.paymentRequest.id },
      });
      expect(request!).not.toBeNull();
      expect(request!.type).toBe("withdrawal");
      expect(request!.orderId).toBe(order.id);
      expect(request!.amount.equals(expectedProceeds)).toBe(true);
      expect(request!.sakAmount!.equals(qty)).toBe(true);
      expect(request!.rateUsedAtRequest!.equals(price)).toBe(true);

      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.balance.toString()).toBe("1000");
      expect(wallet.frozenBalance.equals(qty)).toBe(true);
    });

    it("rejects a sell when available balance is insufficient", async () => {
      await seedWalletBalance(userId, "5");
      await expect(service.createSellRequest({ userId, sakAmount: "10" })).rejects.toMatchObject({
        statusCode: 400,
        code: "INSUFFICIENT_BALANCE",
      });
    });

    it("rejects zero, negative and malformed SAK amounts", async () => {
      for (const bad of ["0", "-3", "abc", "1.12345"]) {
        await expect(service.createSellRequest({ userId, sakAmount: bad })).rejects.toBeInstanceOf(
          ValidationError,
        );
      }
    });
  });

  describe("sell order settlement", () => {
    it("debits exactly the SAK quantity on approval and records a sell transaction linked to the order", async () => {
      await seedWalletBalance(userId, "1000");
      const qty = new Prisma.Decimal("20");
      const { paymentRequest, order } = (await service.createSellRequest({
        userId,
        sakAmount: "20",
      })) as { paymentRequest: { id: string }; order: { id: string } };

      await service.approvePaymentRequest(paymentRequest.id, reviewerId);

      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.balance.toString()).toBe("980");
      expect(wallet.frozenBalance.toString()).toBe("0");

      const txns = await prisma.transaction.findMany({
        where: { paymentRequestId: paymentRequest.id },
      });
      expect(txns).toHaveLength(1);
      expect(txns[0].type).toBe("sell");
      expect(txns[0].direction).toBe("debit");
      expect(txns[0].status).toBe("completed");
      expect(txns[0].amount.equals(qty)).toBe(true);

      const freshOrder = (await prisma.order.findUnique({ where: { id: order.id } }))!;
      expect(freshOrder.status).toBe("completed");
      expect(freshOrder.completedAt).not.toBeNull();
      expect(freshOrder.transactionId).toBe(txns[0].id);
    });

    it("releases the freeze and rejects the order on reject", async () => {
      await seedWalletBalance(userId, "1000");
      const { paymentRequest, order } = (await service.createSellRequest({
        userId,
        sakAmount: "20",
      })) as { paymentRequest: { id: string }; order: { id: string } };

      const rejected = await service.rejectPaymentRequest(
        paymentRequest.id,
        reviewerId,
        "payout method unavailable",
      );

      expect(rejected.status).toBe("rejected");
      const wallet = (await prisma.wallet.findUnique({ where: { userId } }))!;
      expect(wallet.balance.toString()).toBe("1000");
      expect(wallet.frozenBalance.toString()).toBe("0");

      const txns = await prisma.transaction.findMany({
        where: { paymentRequestId: paymentRequest.id },
      });
      expect(txns).toHaveLength(1);
      expect(txns[0].type).toBe("sell");
      expect(txns[0].status).toBe("rejected");
      expect(txns[0].direction).toBe("credit");

      const freshOrder = (await prisma.order.findUnique({ where: { id: order.id } }))!;
      expect(freshOrder.status).toBe("rejected");
      expect(freshOrder.cancelledAt).not.toBeNull();
      expect(freshOrder.rejectionReason).toBe("payout method unavailable");
    });
  });

  async function seedWalletBalance(uid: string, balance: string, frozen = "0"): Promise<void> {
    await prisma.wallet.create({
      data: {
        userId: uid,
        balance: new Prisma.Decimal(balance),
        frozenBalance: new Prisma.Decimal(frozen),
      },
    });
  }
});

async function createTestUser(): Promise<string> {
  let role = await prisma.role.findUnique({ where: { name: "investor" } });
  if (!role) {
    role = await prisma.role.create({ data: { name: "investor", description: "test fixture" } });
  }
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const user = await prisma.user.create({
    data: {
      email: `sak-test-${suffix}@sak100.invalid`,
      accountNumber: `9${suffix.slice(-8)}`,
      firstName: "Test",
      lastName: "User",
      roleId: role.id,
      status: "active",
      emailVerified: true,
    },
  });
  return user.id;
}

function floorSak(v: Prisma.Decimal): Prisma.Decimal {
  return v.toDecimalPlaces(4, Prisma.Decimal.ROUND_DOWN);
}

function ceilSak(v: Prisma.Decimal): Prisma.Decimal {
  return v.toDecimalPlaces(4, Prisma.Decimal.ROUND_UP);
}

function reservedOf(sak: Prisma.Decimal): Prisma.Decimal {
  return toDecimal(sak);
}

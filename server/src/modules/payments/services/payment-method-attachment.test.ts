import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { toDecimal, ceilMoney } from "../../../lib/money.js";
import { resolveCurrentSakPrice } from "../../../services/pricing.service.js";
import { PaymentAccountingService } from "./payment-accounting.service.js";
import { ValidationError } from "../../../lib/errors.js";

const SAK_QTY_DIGITS = 4;
const DB_ERR_PREFIX = "PaymentMethod attachment";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb(`${DB_ERR_PREFIX} (integration)`, () => {
  let service: PaymentAccountingService;
  let userIdA: string;
  let userIdB: string;
  let goldPriceId: string;
  let sakConfigId: string | null;
  let price: Prisma.Decimal;

  beforeEach(async () => {
    service = new PaymentAccountingService(prisma);
    userIdA = await createTestUser();
    userIdB = await createTestUser();

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
    for (const uid of [userIdA, userIdB]) {
      await prisma.transaction.deleteMany({ where: { paymentRequest: { userId: uid } } });
      await prisma.notification.deleteMany({ where: { userId: uid } });
      await prisma.paymentRequest.deleteMany({ where: { userId: uid } });
      await prisma.order.deleteMany({ where: { userId: uid } });
      await prisma.paymentMethod.deleteMany({ where: { userId: uid } });
      await prisma.wallet.deleteMany({ where: { userId: uid } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    await prisma.goldPriceHistory.deleteMany({ where: { id: goldPriceId } });
    if (sakConfigId) {
      await prisma.sakConfig.deleteMany({ where: { id: sakConfigId } });
    }
  });

  it("attaches a saved payment method to a deposit and uses its type as method", async () => {
    const methodId = await createPaymentMethod(userIdA, "card", { last4: "4242", brand: "Visa" });

    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "deposit",
      amount: "100",
      paymentMethodId: methodId,
    });

    expect(request.paymentMethodId).toBe(methodId);
    expect(request.method).toBe("card");
    expect(request.status).toBe("pending");

    const wallet = await prisma.wallet.findUnique({ where: { userId: userIdA } });
    expect(wallet).toBeNull();
  });

  it("attaches a saved payment method to a withdrawal and freezes SAK as before", async () => {
    await seedWalletBalance(userIdA, "1000");
    const methodId = await createPaymentMethod(userIdA, "bank_transfer", {
      accountNumber: "1234567890",
      bankName: "NBE",
    });

    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "withdrawal",
      amount: "50",
      paymentMethodId: methodId,
    });

    expect(request.paymentMethodId).toBe(methodId);
    expect(request.method).toBe("bank_transfer");

    const expectedReserved = ceilMoney(toDecimal("50").div(price), SAK_QTY_DIGITS);
    const wallet = (await prisma.wallet.findUnique({ where: { userId: userIdA } }))!;
    expect(wallet!.frozenBalance.equals(expectedReserved)).toBe(true);
    expect(wallet!.balance.toString()).toBe("1000");
    expect(request.sakAmount!.equals(expectedReserved)).toBe(true);
  });

  it("attaches the default payment method when its id is sent", async () => {
    const defaultId = await createPaymentMethod(userIdA, "bank_transfer", {
      accountNumber: "1111111111",
    });
    await prisma.paymentMethod.update({
      where: { id: defaultId },
      data: { isDefault: true },
    });
    const otherId = await createPaymentMethod(userIdA, "card", { last4: "5555", brand: "Visa" });

    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "deposit",
      amount: "75",
      paymentMethodId: defaultId,
    });

    expect(request.paymentMethodId).toBe(defaultId);
    expect(request.paymentMethodId).not.toBe(otherId);
    expect(request.method).toBe("bank_transfer");
  });

  it("accepts a non-default saved payment method selected explicitly", async () => {
    await seedWalletBalance(userIdA, "1000");
    const defaultId = await createPaymentMethod(userIdA, "bank_transfer", {
      accountNumber: "2222222222",
    });
    await prisma.paymentMethod.update({
      where: { id: defaultId },
      data: { isDefault: true },
    });
    const nonDefaultId = await createPaymentMethod(userIdA, "card", {
      last4: "7777",
      brand: "Mastercard",
    });

    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "withdrawal",
      amount: "30",
      paymentMethodId: nonDefaultId,
    });

    expect(request.paymentMethodId).toBe(nonDefaultId);
    expect(request.paymentMethodId).not.toBe(defaultId);
    expect(request.method).toBe("card");
  });

  it("rejects an invalid paymentMethodId that does not exist", async () => {
    await expect(
      service.createPaymentRequest({
        userId: userIdA,
        type: "deposit",
        amount: "100",
        paymentMethodId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    const requests = await prisma.paymentRequest.findMany({ where: { userId: userIdA } });
    expect(requests).toHaveLength(0);
  });

  it("rejects using another user's payment method", async () => {
    const methodB = await createPaymentMethod(userIdB, "bank_transfer", {
      accountNumber: "3333333333",
    });

    await expect(
      service.createPaymentRequest({
        userId: userIdA,
        type: "deposit",
        amount: "100",
        paymentMethodId: methodB,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      service.createPaymentRequest({
        userId: userIdA,
        type: "withdrawal",
        amount: "50",
        paymentMethodId: methodB,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("treats empty-whitespace paymentMethodId as no saved method", async () => {
    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "deposit",
      amount: "100",
      paymentMethodId: "",
    });

    expect(request.paymentMethodId).toBeNull();
    expect(request.method).toBe("bank_transfer");
  });

  it("keeps the manual bank-transfer/proof flow intact without a saved method", async () => {
    const deposit = await service.createPaymentRequest({
      userId: userIdA,
      type: "deposit",
      amount: "100",
      proofPath: "payments/proof.png",
      method: "bank_transfer",
    });
    expect(deposit.paymentMethodId).toBeNull();
    expect(deposit.method).toBe("bank_transfer");
    expect(deposit.proofPath).toBe("payments/proof.png");

    await seedWalletBalance(userIdA, "1000");
    const withdrawal = await service.createPaymentRequest({
      userId: userIdA,
      type: "withdrawal",
      amount: "50",
      method: "bank_transfer",
    });
    expect(withdrawal.paymentMethodId).toBeNull();
    expect(withdrawal.method).toBe("bank_transfer");
    expect(withdrawal.sakAmount).not.toBeNull();
  });

  it("does not change accounting when approving a deposit attached to a payment method", async () => {
    const methodId = await createPaymentMethod(userIdA, "bank_transfer", {
      accountNumber: "4444444444",
    });
    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "deposit",
      amount: "100",
      paymentMethodId: methodId,
    });

    const approved = await service.approvePaymentRequest(request.id, userIdA);

    expect(approved.status).toBe("approved");
    expect(approved.paymentMethodId).toBe(methodId);

    const expectedCredit = toDecimal("100")
      .div(price)
      .toDecimalPlaces(SAK_QTY_DIGITS, Prisma.Decimal.ROUND_DOWN);
    const wallet = (await prisma.wallet.findUnique({ where: { userId: userIdA } }))!;
    expect(wallet!.balance.equals(expectedCredit)).toBe(true);
    expect(wallet!.frozenBalance.toString()).toBe("0");

    const txns = await prisma.transaction.findMany({ where: { paymentRequestId: request.id } });
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe("deposit");
    expect(txns[0].direction).toBe("credit");
    expect(txns[0].status).toBe("completed");
    expect(txns[0].amount.equals(expectedCredit)).toBe(true);
    expect(txns[0].usdAmount!.equals(toDecimal("100"))).toBe(true);

    const notifications = await prisma.notification.findMany({
      where: { userId: userIdA, type: "transaction" },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });

  it("does not change accounting when approving a withdrawal attached to a payment method", async () => {
    await seedWalletBalance(userIdA, "1000");
    const methodId = await createPaymentMethod(userIdA, "card", { last4: "8888", brand: "Visa" });
    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "withdrawal",
      amount: "50",
      paymentMethodId: methodId,
    });
    const reserved = request.sakAmount!;

    const approved = await service.approvePaymentRequest(request.id, userIdA);

    expect(approved.status).toBe("approved");
    expect(approved.paymentMethodId).toBe(methodId);

    const wallet = (await prisma.wallet.findUnique({ where: { userId: userIdA } }))!;
    expect(wallet!.balance.equals(toDecimal("1000").minus(reserved))).toBe(true);
    expect(wallet!.frozenBalance.toString()).toBe("0");

    const txns = await prisma.transaction.findMany({ where: { paymentRequestId: request.id } });
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe("withdrawal");
    expect(txns[0].direction).toBe("debit");
    expect(txns[0].status).toBe("completed");
    expect(txns[0].amount.equals(reserved)).toBe(true);
  });

  it("releases the freeze on rejection without changing the attached method reference", async () => {
    await seedWalletBalance(userIdA, "1000");
    const methodId = await createPaymentMethod(userIdA, "bank_transfer", {
      accountNumber: "6666666666",
    });
    const request = await service.createPaymentRequest({
      userId: userIdA,
      type: "withdrawal",
      amount: "50",
      paymentMethodId: methodId,
    });

    const rejected = await service.rejectPaymentRequest(request.id, userIdA, "policy");

    expect(rejected.status).toBe("rejected");
    expect(rejected.paymentMethodId).toBe(methodId);

    const wallet = (await prisma.wallet.findUnique({ where: { userId: userIdA } }))!;
    expect(wallet!.balance.toString()).toBe("1000");
    expect(wallet!.frozenBalance.toString()).toBe("0");
  });

  async function createPaymentMethod(
    uid: string,
    type: "bank_transfer" | "card" | "other",
    details: Record<string, string>,
  ): Promise<string> {
    const method = await prisma.paymentMethod.create({
      data: { userId: uid, type, details, isDefault: false },
    });
    return method.id;
  }

  async function seedWalletBalance(uid: string, balance: string): Promise<void> {
    await prisma.wallet.create({
      data: {
        userId: uid,
        balance: new Prisma.Decimal(balance),
        frozenBalance: new Prisma.Decimal("0"),
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
      email: `pm-link-${suffix}@sak100.invalid`,
      accountNumber: `5${suffix.slice(-8)}`,
      firstName: "PM",
      lastName: "Link",
      roleId: role.id,
      status: "active",
      emailVerified: true,
    },
  });
  return user.id;
}

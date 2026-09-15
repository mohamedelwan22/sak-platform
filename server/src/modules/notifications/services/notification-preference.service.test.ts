import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import {
  createNotificationIfPreferred,
  isNotificationEnabled,
  NOTIFICATION_CHANNEL_EMAIL,
  NOTIFICATION_CHANNEL_IN_APP,
} from "./notification-preference.service.js";
import {
  resolveCurrentSakConfig,
  resolveCurrentSakPrice,
} from "../../../services/pricing.service.js";
import { PaymentAccountingService } from "../../payments/services/payment-accounting.service.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb("Notification preference enforcement (integration)", () => {
  let userId: string;
  let service: PaymentAccountingService;

  beforeEach(async () => {
    userId = await createTestUser();
    service = new PaymentAccountingService(prisma);
    await seedPricingFixture();
  });

  afterEach(async () => {
    await prisma.notificationPreference.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { paymentRequest: { userId } } });
    await prisma.paymentRequest.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await cleanupPricingFixture();
  });

  describe("isNotificationEnabled", () => {
    it("defaults to enabled when no preference row exists", async () => {
      expect(
        await isNotificationEnabled(prisma, userId, "transaction", NOTIFICATION_CHANNEL_IN_APP),
      ).toBe(true);
    });

    it("reflects an explicit disabled preference for a non-security type", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      expect(
        await isNotificationEnabled(prisma, userId, "transaction", NOTIFICATION_CHANNEL_IN_APP),
      ).toBe(false);
    });

    it("is true when the user explicitly re-enabled the type", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, true);
      expect(
        await isNotificationEnabled(prisma, userId, "transaction", NOTIFICATION_CHANNEL_IN_APP),
      ).toBe(true);
    });

    it("is channel-specific: an email preference never suppresses in_app delivery", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_EMAIL, false);
      expect(
        await isNotificationEnabled(prisma, userId, "transaction", NOTIFICATION_CHANNEL_IN_APP),
      ).toBe(true);
      expect(
        await isNotificationEnabled(prisma, userId, "transaction", NOTIFICATION_CHANNEL_EMAIL),
      ).toBe(false);
    });

    it("always allows security regardless of any disabled preference", async () => {
      await setPreference(userId, "security", NOTIFICATION_CHANNEL_IN_APP, false);
      await setPreference(userId, "security", NOTIFICATION_CHANNEL_EMAIL, false);
      for (const channel of [NOTIFICATION_CHANNEL_IN_APP, NOTIFICATION_CHANNEL_EMAIL]) {
        expect(await isNotificationEnabled(prisma, userId, "security", channel)).toBe(true);
      }
    });
  });

  describe("createNotificationIfPreferred", () => {
    it("creates a notification when no preference exists", async () => {
      const created = await createNotificationIfPreferred(prisma, {
        userId,
        title: "Test title",
        message: "Test message",
        type: "system",
      });
      expect(created).not.toBeNull();
      expect(created!.userId).toBe(userId);
      expect(created!.type).toBe("system");
    });

    it("skips the notification when the type is disabled for in_app", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      const created = await createNotificationIfPreferred(prisma, {
        userId,
        title: "Withdrawal Approved",
        message: "Should be suppressed",
        type: "transaction",
      });
      expect(created).toBeNull();
      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
    });

    it("creates security notifications even when the user disabled security", async () => {
      await setPreference(userId, "security", NOTIFICATION_CHANNEL_IN_APP, false);
      const created = await createNotificationIfPreferred(prisma, {
        userId,
        title: "Security alert",
        message: "Always delivered",
        type: "security",
      });
      expect(created).not.toBeNull();
      expect(created!.type).toBe("security");
    });

    it("respects a per-channel email preference without touching in_app delivery", async () => {
      await setPreference(userId, "profit", NOTIFICATION_CHANNEL_EMAIL, false);
      const created = await createNotificationIfPreferred(prisma, {
        userId,
        title: "Profit",
        message: "In-app still delivered",
        type: "profit",
        channel: NOTIFICATION_CHANNEL_IN_APP,
      });
      expect(created).not.toBeNull();
    });
  });

  describe('"المعاملات" (transaction) preference controls withdrawal notifications', () => {
    it("REGRESSION: transaction/in_app=false -> withdrawal approved -> NO notification created", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      await seedWalletBalance(userId, "1000");

      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
      });
      const approved = await service.approvePaymentRequest(request.id, userId);

      expect(approved.status).toBe("approved");
      expect(await prisma.transaction.count({ where: { paymentRequestId: request.id } })).toBe(1);
      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
    });

    it("REGRESSION: transaction/in_app=true -> withdrawal approved -> notification created", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, true);
      await seedWalletBalance(userId, "1000");

      const request = await service.createPaymentRequest({
        userId,
        type: "withdrawal",
        amount: "50",
      });
      const approved = await service.approvePaymentRequest(request.id, userId);

      expect(approved.status).toBe("approved");
      const notifications = await prisma.notification.findMany({ where: { userId } });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("transaction");
      expect(notifications[0].title).toBe("Withdrawal Approved");
    });

    it("uses the same type the in-app preference list exposes for transactions", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      const enabled = await isNotificationEnabled(prisma, userId, "transaction");
      const notifications = await prisma.notification.findMany({
        where: { userId, type: "transaction" },
      });
      expect(enabled).toBe(false);
      expect(notifications).toHaveLength(0);
    });
  });

  describe("enforcement inside domain service transactions", () => {
    it("does not notify when transaction preferences are disabled for a deposit approval", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });
      await service.approvePaymentRequest(request.id, userId);

      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
      expect(await prisma.transaction.count({ where: { paymentRequestId: request.id } })).toBe(1);
    });

    it("does not notify when transaction preferences are disabled for a sell request", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, false);
      await prisma.wallet.create({
        data: {
          userId,
          balance: new Prisma.Decimal("1000"),
          frozenBalance: new Prisma.Decimal("0"),
        },
      });
      await service.createSellRequest({ userId, sakAmount: "20" });

      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
    });

    it("notifies normally when transaction preferences remain enabled", async () => {
      await setPreference(userId, "transaction", NOTIFICATION_CHANNEL_IN_APP, true);
      const request = await service.createPaymentRequest({
        userId,
        type: "deposit",
        amount: "100",
      });
      await service.approvePaymentRequest(request.id, userId);

      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      const notification = await prisma.notification.findFirst({ where: { userId } });
      expect(notification!.type).toBe("transaction");
      expect(notification!.title).toBe("Deposit Approved");
    });
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

async function createTestUser(): Promise<string> {
  let role = await prisma.role.findUnique({ where: { name: "investor" } });
  if (!role) {
    role = await prisma.role.create({ data: { name: "investor", description: "test fixture" } });
  }
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const user = await prisma.user.create({
    data: {
      email: `sak-pref-test-${suffix}@sak100.invalid`,
      accountNumber: `8${suffix.slice(-8)}`,
      firstName: "Pref",
      lastName: "Test",
      roleId: role.id,
      status: "active",
      emailVerified: true,
    },
  });
  return user.id;
}

async function setPreference(
  uid: string,
  type: NotificationType,
  channel: string,
  enabled: boolean,
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userId_type_channel: { userId: uid, type, channel } },
    create: { userId: uid, type, channel, enabled },
    update: { enabled },
  });
}

let goldPriceId: string;
let sakConfigId: string | null = null;

async function seedPricingFixture(): Promise<void> {
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
  const config = await resolveCurrentSakConfig(prisma);
  if (!resolved || !config) throw new Error("SAK pricing fixture unavailable");
}

async function cleanupPricingFixture(): Promise<void> {
  await prisma.goldPriceHistory.deleteMany({ where: { id: goldPriceId } });
  if (sakConfigId) {
    await prisma.sakConfig.deleteMany({ where: { id: sakConfigId } });
  }
}

import { Router } from "express";
import { Prisma } from "@prisma/client";
import { authenticate } from "../../auth/middleware/index.js";
import { prisma } from "../../../lib/prisma.js";
import {
  sendSuccess,
  sendNotFound,
  sendError,
} from "../../../common/responses/index.js";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { name: true } },
        kycSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    });
    if (!user) {
      sendNotFound(res, "User not found");
      return;
    }
    const kycStatus = user.kycSubmissions?.[0]?.status ?? "not_submitted";
    sendSuccess(res, { ...user, kyc_status: kycStatus }, "Profile retrieved");
  } catch {
    sendError(res, "Failed to retrieve profile");
  }
});

router.get("/wallet", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        frozenBalance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const mapped = wallet ? { ...wallet, sak_balance: wallet.balance } : null;
    sendSuccess(res, mapped, "Wallet retrieved");
  } catch {
    sendError(res, "Failed to retrieve wallet");
  }
});

router.get("/holdings", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const holdings = await prisma.holding.findMany({
      where: { userId },
      include: {
        land: {
          select: {
            id: true,
            titleAr: true,
            country: true,
            city: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const mapped = holdings.map((h) => ({
      id: h.id,
      sak_owned: h.sakOwned,
      purchase_price_per_sak_usd: Number(h.purchasePricePerSakUsd),
      purchase_date: h.purchaseDate.toISOString(),
      maturity_date: h.maturityDate.toISOString(),
      status: h.status,
      land: h.land
        ? {
            id: h.land.id,
            title_ar: h.land.titleAr,
            country: h.land.country,
            city: h.land.city,
            cover_image_url: h.land.coverImageUrl,
          }
        : null,
      created_at: h.createdAt.toISOString(),
    }));
    sendSuccess(res, mapped, "Holdings retrieved");
  } catch {
    sendError(res, "Failed to retrieve holdings");
  }
});

router.get("/transactions", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      sendSuccess(res, [], "No transactions");
      return;
    }
    const transactions = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const mapped = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      direction: t.type === "deposit" || t.type === "transfer_in" ? "credit" : "debit",
      sak_amount: t.amount,
      usd_amount: t.amount,
      sak_price_at_time: null,
      created_at: t.createdAt.toISOString(),
      status: t.status,
      description: t.description,
      wallet_id: t.walletId,
    }));
    sendSuccess(res, mapped, "Transactions retrieved");
  } catch {
    sendError(res, "Failed to retrieve transactions");
  }
});

router.get("/payment-requests", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const requests = await prisma.paymentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const mapped = requests.map((r) => ({
      id: r.id,
      type: r.type,
      method: r.method,
      usd_amount: r.amount,
      currency: r.currency,
      sak_amount: r.sakAmount,
      status: r.status,
      rejection_reason: r.rejectionReason,
      admin_notes: r.adminNotes,
      proof_path: r.proofPath,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));
    sendSuccess(res, mapped, "Payment requests retrieved");
  } catch {
    sendError(res, "Failed to retrieve payment requests");
  }
});

router.post("/payment-requests", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const { type, usdAmount, method, proofPath } = req.body;
    const validTypes = ["deposit", "withdrawal"];
    const validMethods = ["bank_transfer", "card", "wallet"];
    const paymentType = validTypes.includes(type) ? type : "deposit";
    const paymentMethod = validMethods.includes(method) ? method : "bank_transfer";
    const amount = Number(usdAmount);
    if (!amount || amount <= 0) {
      sendError(res, "Invalid amount", 400, "VALIDATION_ERROR");
      return;
    }
    const request = await prisma.paymentRequest.create({
      data: {
        userId,
        type: paymentType,
        method: paymentMethod,
        amount,
        proofPath: typeof proofPath === "string" ? proofPath : null,
      },
    });
    sendSuccess(res, request, "Payment request created", 201);
  } catch {
    sendError(res, "Failed to create payment request");
  }
});

router.get("/kyc", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const submission = await prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, submission, "KYC submission retrieved");
  } catch {
    sendError(res, "Failed to retrieve KYC submission");
  }
});

router.post("/buy-sak", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }

    const { landId, sakAmount } = req.body;

    if (!landId || typeof landId !== "string") {
      sendError(res, "Invalid land ID", 400, "VALIDATION_ERROR");
      return;
    }

    const amount = Number(sakAmount);
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      sendError(res, "Invalid SAK amount — must be a positive integer", 400, "VALIDATION_ERROR");
      return;
    }

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      sendNotFound(res, "Land not found");
      return;
    }

    if (land.status !== "active" && land.status !== "partially_sold") {
      sendError(res, "This land is not available for purchase", 400, "INVALID_STATUS");
      return;
    }

    if (new Prisma.Decimal(land.availableSak.toString()).lessThan(new Prisma.Decimal(amount))) {
      sendError(res, "Insufficient SAK inventory", 400, "INSUFFICIENT_INVENTORY");
      return;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      sendNotFound(res, "Wallet not found");
      return;
    }

    if (new Prisma.Decimal(wallet.balance.toString()).lessThan(new Prisma.Decimal(amount))) {
      sendError(res, "Insufficient wallet balance", 400, "INSUFFICIENT_BALANCE");
      return;
    }

    const latestGoldPrice = await prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!latestGoldPrice) {
      sendError(res, "Gold price not available", 503, "PRICE_UNAVAILABLE");
      return;
    }

    const latestSakConfig = await prisma.sakConfig.findFirst({
      orderBy: { effectiveFrom: "desc" },
    });
    if (!latestSakConfig) {
      sendError(res, "SAK configuration not available", 503, "CONFIG_UNAVAILABLE");
      return;
    }

    const pricePerSak = new Prisma.Decimal(latestGoldPrice.gramPriceUsd.toString())
      .mul(new Prisma.Decimal(latestSakConfig.sakToGoldRatio.toString()));

    const result = await prisma.$transaction(async (tx) => {
      const updatedLand = await tx.land.update({
        where: { id: landId },
        data: { availableSak: { decrement: amount } },
      });

      const existingHolding = await tx.holding.findFirst({
        where: { userId, landId },
      });

      let holding;
      if (existingHolding) {
        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            sakOwned: { increment: amount },
            purchasePricePerSakUsd: pricePerSak,
          },
        });
      } else {
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + land.maturityMonths);

        holding = await tx.holding.create({
          data: {
            userId,
            landId,
            sakOwned: amount,
            purchasePricePerSakUsd: pricePerSak,
            maturityDate,
            status: "active",
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "transfer_out",
          amount,
          status: "completed",
          description: `شراء ${amount} وحدة SAK من الأصل ${land.titleAr}`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId,
          title: "تم شراء SAK بنجاح",
          message: `تم شراء ${amount} وحدة SAK بنجاح من ${land.titleAr}`,
          type: "investment",
        },
      });

      const availableAfter = new Prisma.Decimal(updatedLand.availableSak.toString());
      if (availableAfter.equals(0)) {
        await tx.land.update({
          where: { id: landId },
          data: { status: "sold_out" },
        });
      } else if (land.status === "active") {
        await tx.land.update({
          where: { id: landId },
          data: { status: "partially_sold" },
        });
      }

      return {
        holding,
        transaction,
        notification,
        wallet: { balance: updatedWallet.balance },
        land: { availableSak: updatedLand.availableSak },
        receipt: {
          landId,
          landTitle: land.titleAr,
          sakAmount: amount,
          pricePerSakUsd: pricePerSak.toNumber(),
          totalCostSak: pricePerSak.mul(amount).toNumber(),
          walletBalanceAfter: updatedWallet.balance.toNumber(),
          remainingInventory: updatedLand.availableSak.toNumber(),
          maturityDate: holding.maturityDate.toISOString(),
          transactionId: transaction.id,
          holdingId: holding.id,
          purchasedAt: transaction.createdAt.toISOString(),
        },
      };
    });

    sendSuccess(res, result, "SAK purchased successfully", 201);
  } catch {
    sendError(res, "Failed to purchase SAK");
  }
});

export default router;

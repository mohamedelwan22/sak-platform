import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { authenticate } from "../../auth/middleware/index.js";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";
import { PaymentAccountingService } from "../../payments/services/payment-accounting.service.js";
import { MarketplaceService } from "../../marketplace/services/marketplace.service.js";
import { ValidationError, AppError, NotFoundError } from "../../../lib/errors.js";
import { updateProfileSchema } from "../validators/index.js";

const router = Router();
const accountingService = new PaymentAccountingService(prisma);
const marketplaceService = new MarketplaceService();
const storageService = new LocalStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError("Invalid image type. Use JPG, PNG, WEBP or GIF."));
    }
  },
});

const PROFILE_SELECT = {
  id: true,
  email: true,
  accountNumber: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
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
} as const;

async function loadProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });
  if (!user) return null;
  const { kycSubmissions, ...rest } = user;
  return { ...rest, kyc_status: kycSubmissions?.[0]?.status ?? "not_submitted" };
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const profile = await loadProfile(userId);
    if (!profile) {
      sendNotFound(res, "User not found");
      return;
    }
    sendSuccess(res, profile, "Profile retrieved");
  } catch {
    sendError(res, "Failed to retrieve profile");
  }
});

router.patch("/", authenticate, validate(updateProfileSchema), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const { firstName, lastName, phone } = req.body;

    const data: Prisma.UserUpdateInput = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone ?? null;

    await prisma.user.update({ where: { id: userId }, data });

    const profile = await loadProfile(userId);
    sendSuccess(res, profile, "Profile updated");
  } catch {
    sendError(res, "Failed to update profile");
  }
});

router.post("/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const file = req.file;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    if (!file) {
      sendError(res, "Avatar image is required", 400, "VALIDATION_ERROR");
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendNotFound(res, "User not found");
      return;
    }

    if (user.avatarUrl) {
      await storageService.delete(user.avatarUrl).catch(() => undefined);
    }

    const uploaded = await storageService.upload(file, "avatar");
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: uploaded.path } });

    sendSuccess(res, { avatarUrl: uploaded.path }, "Avatar uploaded", 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      sendError(res, err.message, 400, "VALIDATION_ERROR");
      return;
    }
    sendError(res, "Failed to upload avatar");
  }
});

router.get("/avatar", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user?.avatarUrl) {
      sendNotFound(res, "Avatar not found");
      return;
    }
    const filePath = storageService.getFilePath(user.avatarUrl);
    if (!fs.existsSync(filePath)) {
      sendNotFound(res, "Avatar not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Cache-Control", "no-store");
    res.type(MIME_BY_EXT[ext] ?? "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch {
    sendError(res, "Failed to retrieve avatar");
  }
});

router.delete("/avatar", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (user?.avatarUrl) {
      await storageService.delete(user.avatarUrl).catch(() => undefined);
    }
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    sendSuccess(res, { avatarUrl: null }, "Avatar removed");
  } catch {
    sendError(res, "Failed to remove avatar");
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
    const mapped = wallet
      ? {
          ...wallet,
          sak_balance: wallet.balance,
          frozen_balance: wallet.frozenBalance,
          available_sak: wallet.balance.sub(wallet.frozenBalance),
        }
      : null;
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
    const { type, direction, status, from, to } = req.query;
    const where: Prisma.TransactionWhereInput = { walletId: wallet.id };
    if (type && typeof type === "string") where.type = type as Prisma.TransactionWhereInput["type"];
    if (direction === "credit" || direction === "debit") where.direction = direction;
    if (status && typeof status === "string")
      where.status = status as Prisma.TransactionWhereInput["status"];
    const fromDate = from ? Date.parse(String(from)) : NaN;
    const toDate = to ? Date.parse(String(to)) : NaN;
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (!Number.isNaN(fromDate)) createdAtFilter.gte = new Date(fromDate);
    if (!Number.isNaN(toDate)) createdAtFilter.lte = new Date(toDate);
    if (Object.keys(createdAtFilter).length > 0) where.createdAt = createdAtFilter;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const mapped = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      direction: t.direction,
      sak_amount: t.sakAmount ?? t.amount,
      usd_amount:
        t.usdAmount ?? (t.type === "deposit" || t.type === "withdrawal" ? t.amount : null),
      sak_price_at_time: t.pricePerSakUsd,
      fees_usd: t.feesUsd,
      fees_sak: t.feesSak,
      unit: t.unit,
      created_at: t.createdAt.toISOString(),
      status: t.status,
      description: t.description,
      wallet_id: t.walletId,
      payment_request_id: t.paymentRequestId,
      holding_id: t.holdingId,
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
      payment_method_id: r.paymentMethodId,
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
    const { type, usdAmount, method, proofPath, paymentMethodId } = req.body;
    const validTypes = ["deposit", "withdrawal"];
    const validMethods = ["bank_transfer", "card", "wallet"];
    if (!validTypes.includes(type)) {
      sendError(res, "Invalid payment type", 400, "VALIDATION_ERROR");
      return;
    }
    if (
      paymentMethodId !== undefined &&
      paymentMethodId !== null &&
      typeof paymentMethodId !== "string"
    ) {
      sendError(res, "Invalid payment method", 400, "VALIDATION_ERROR");
      return;
    }
    const paymentMethod = validMethods.includes(method) ? method : "bank_transfer";
    const amount = String(typeof usdAmount === "number" ? usdAmount : Number(usdAmount));
    if (!/^\d+(\.\d{1,8})?$/.test(amount)) {
      sendError(res, "Invalid amount", 400, "VALIDATION_ERROR");
      return;
    }

    const request = await accountingService.createPaymentRequest({
      userId,
      type,
      amount,
      currency: "USD",
      method: paymentMethod,
      proofPath: typeof proofPath === "string" ? proofPath : null,
      paymentMethodId: typeof paymentMethodId === "string" ? paymentMethodId : null,
    });

    sendSuccess(
      res,
      {
        id: request.id,
        type: request.type,
        method: request.method,
        payment_method_id: request.paymentMethodId,
        usd_amount: request.amount,
        currency: request.currency,
        sak_amount: request.sakAmount,
        rate_used_at_request: request.rateUsedAtRequest,
        status: request.status,
        created_at: request.createdAt.toISOString(),
        updated_at: request.updatedAt.toISOString(),
      },
      "Payment request created",
      201,
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      sendError(res, err.message, 400, "VALIDATION_ERROR");
      return;
    }
    if (err instanceof AppError && err.statusCode === 400) {
      sendError(res, err.message, 400, err.code);
      return;
    }
    if (err instanceof AppError && err.statusCode === 503) {
      sendError(res, err.message, 503, err.code);
      return;
    }
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
      select: {
        id: true,
        userId: true,
        documentType: true,
        frontImagePath: true,
        backImagePath: true,
        selfieImagePath: true,
        status: true,
        adminNotes: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!submission) {
      sendSuccess(res, null, "KYC submission retrieved");
      return;
    }
    const mapped = {
      id: submission.id,
      userId: submission.userId,
      documentType: submission.documentType,
      frontImagePath: submission.frontImagePath,
      backImagePath: submission.backImagePath,
      selfieImagePath: submission.selfieImagePath,
      status: submission.status,
      rejection_reason: submission.status === "rejected" ? submission.adminNotes : null,
      admin_notes: submission.adminNotes,
      reviewed_by: submission.reviewedBy,
      reviewed_at: submission.reviewedAt?.toISOString() ?? null,
      created_at: submission.createdAt.toISOString(),
      updated_at: submission.updatedAt.toISOString(),
    };
    sendSuccess(res, mapped, "KYC submission retrieved");
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

    const result = await marketplaceService.buySak(userId, {
      landId: typeof landId === "string" ? landId : "",
      sakAmount: Number(sakAmount),
    });

    sendSuccess(res, result, "SAK purchased successfully", 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      sendError(res, err.message, 400, "VALIDATION_ERROR");
      return;
    }
    if (err instanceof NotFoundError) {
      sendError(res, err.message, 404, "NOT_FOUND");
      return;
    }
    if (err instanceof AppError && (err.statusCode === 400 || err.statusCode === 404)) {
      sendError(res, err.message, err.statusCode, err.code);
      return;
    }
    if (err instanceof AppError && err.statusCode === 503) {
      sendError(res, err.message, 503, err.code);
      return;
    }
    sendError(res, "Failed to purchase SAK");
  }
});

router.post("/sell-sak", authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const { sakAmount, method, holdingId } = req.body;

    const validMethods = ["bank_transfer", "card", "wallet"];
    const paymentMethod = validMethods.includes(method) ? method : "bank_transfer";
    const amount = String(typeof sakAmount === "number" ? sakAmount : Number(sakAmount));
    if (!/^\d+(\.\d{1,4})?$/.test(amount)) {
      sendError(res, "Invalid SAK amount", 400, "VALIDATION_ERROR");
      return;
    }

    const result = await accountingService.createSellRequest({
      userId,
      sakAmount: amount,
      method: paymentMethod,
      holdingId: typeof holdingId === "string" ? holdingId : null,
    });

    const order = result.order as {
      id: string;
      status: string;
      sakQuantity: Prisma.Decimal;
      unitPriceUsd: Prisma.Decimal;
      subtotalUsd: Prisma.Decimal;
      feeSak: Prisma.Decimal;
      feeUsd: Prisma.Decimal;
      totalUsd: Prisma.Decimal;
      createdAt: Date;
    };

    sendSuccess(
      res,
      {
        order: {
          id: order.id,
          type: "sell",
          status: order.status,
          sak_quantity: order.sakQuantity,
          unit_price_usd: order.unitPriceUsd,
          subtotal_usd: order.subtotalUsd,
          fee_sak: order.feeSak,
          fee_usd: order.feeUsd,
          total_usd: order.totalUsd,
          created_at: order.createdAt.toISOString(),
        },
        payment_request: {
          id: result.paymentRequest.id,
          type: result.paymentRequest.type,
          usd_amount: result.paymentRequest.amount,
          currency: result.paymentRequest.currency,
          sak_amount: result.paymentRequest.sakAmount,
          rate_used_at_request: result.paymentRequest.rateUsedAtRequest,
          status: result.paymentRequest.status,
          created_at: result.paymentRequest.createdAt.toISOString(),
        },
      },
      "Sell order created",
      201,
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      sendError(res, err.message, 400, "VALIDATION_ERROR");
      return;
    }
    if (err instanceof AppError && err.statusCode === 400) {
      sendError(res, err.message, 400, err.code);
      return;
    }
    if (err instanceof AppError && err.statusCode === 503) {
      sendError(res, err.message, 503, err.code);
      return;
    }
    sendError(res, "Failed to create sell order");
  }
});

export default router;

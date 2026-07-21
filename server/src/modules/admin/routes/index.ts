import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function mapKyc(row: Record<string, unknown>) {
  const user = row.user as Record<string, string> | null;
  return {
    id: row.id,
    userId: row.userId,
    document_type: row.documentType,
    front_image_path: row.frontImagePath,
    back_image_path: row.backImagePath,
    selfie_image_path: row.selfieImagePath,
    status: row.status,
    admin_notes: row.adminNotes,
    reviewed_by: row.reviewedBy,
    reviewed_at: row.reviewedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    profile: user
      ? { full_name: `${user.firstName} ${user.lastName}`, email: user.email }
      : undefined,
  };
}

function mapPayment(row: Record<string, unknown>) {
  const user = row.user as Record<string, string> | null;
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    method: row.method,
    usd_amount: row.amount,
    currency: row.currency,
    sak_amount: row.sakAmount,
    proof_path: row.proofPath,
    status: row.status,
    admin_notes: row.adminNotes,
    rejection_reason: row.rejectionReason,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    profile: user
      ? { full_name: `${user.firstName} ${user.lastName}`, email: user.email }
      : undefined,
  };
}

const router = Router();

router.post(
  "/signed-url",
  authenticate,
  requirePermission(Permissions.KYC_READ),
  async (req, res) => {
    const { bucket, path: filePath } = req.body;
    if (!filePath) {
      sendNotFound(res, "No file path provided");
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, bucket ?? "", filePath);
    if (!fs.existsSync(fullPath)) {
      sendNotFound(res, "File not found");
      return;
    }
    const fileUrl = `/api/v1/admin/files/${bucket ?? ""}/${filePath}`;
    sendSuccess(res, { url: fileUrl }, "Signed URL generated");
  },
);

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

router.get("/files/:bucket/{*filePath}", (req, res) => {
  const bucket = req.params.bucket;
  const filePathParam = req.params.filePath;
  const filePath = Array.isArray(filePathParam) ? filePathParam.join("/") : String(filePathParam ?? "");
  let fullPath = path.join(UPLOADS_DIR, bucket, filePath);
  if (!fs.existsSync(fullPath) && filePath.startsWith(`${bucket}/`)) {
    fullPath = path.join(UPLOADS_DIR, filePath);
  }
  if (!fs.existsSync(fullPath)) {
    sendNotFound(res, "File not found");
    return;
  }
  const stat = fs.statSync(fullPath);
  res.setHeader("Content-Type", getMimeType(fullPath));
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Content-Disposition", `inline; filename="${path.basename(fullPath)}"`);
  fs.createReadStream(fullPath).pipe(res);
});

router.get("/stats", authenticate, requirePermission(Permissions.USERS_READ), async (_req, res) => {
  const [
    investorCount,
    pendingKycCount,
    pendingDeposits,
    pendingWithdrawals,
    totalLands,
    activeHoldings,
    sakPriceResult,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: { name: "investor" }, deletedAt: null },
    }),
    prisma.kycSubmission.count({ where: { status: "pending" } }),
    prisma.paymentRequest.count({
      where: { type: "deposit", status: "pending" },
    }),
    prisma.paymentRequest.count({
      where: { type: "withdrawal", status: "pending" },
    }),
    prisma.land.count(),
    prisma.holding.aggregate({
      where: { status: "active" },
      _sum: { sakOwned: true },
    }),
    prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
      select: { gramPriceUsd: true },
    }),
  ]);

  const sakPrice = sakPriceResult?.gramPriceUsd ?? 0;
  const totalSak = activeHoldings._sum.sakOwned ?? 0;
  const portfolioValueUsd = Number(totalSak) * Number(sakPrice);

  sendSuccess(
    res,
    {
      investorCount,
      pendingKycCount,
      pendingDeposits,
      pendingWithdrawals,
      totalLands,
      totalSakInvested: Number(totalSak),
      portfolioValueUsd,
      sakPrice: Number(sakPrice),
    },
    "Admin stats retrieved",
  );
});

router.get("/kyc", authenticate, requirePermission(Permissions.KYC_READ), async (req, res) => {
  const { status, page, limit } = req.query;
  const p = page ? Number(page) : 1;
  const l = limit ? Number(limit) : 20;
  const where = status ? { status: String(status) } : {};

  const [data, total] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.kycSubmission.count({ where }),
  ]);

  sendSuccess(
    res,
    {
      data: data.map(mapKyc),
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      hasNextPage: p < Math.ceil(total / l),
      hasPreviousPage: p > 1,
    },
    "KYC submissions retrieved",
  );
});

router.post(
  "/kyc/:id/approve",
  authenticate,
  requirePermission(Permissions.KYC_UPDATE),
  async (req, res) => {
    const id = req.params.id as string;
    const submission = await prisma.kycSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      sendNotFound(res, "KYC submission not found");
      return;
    }
    const updated = await prisma.kycSubmission.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: req.user?.userId,
        reviewedAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        title: "KYC Approved",
        message: "Your identity verification has been approved. You can now access all platform features.",
        type: "kyc",
      },
    });
    sendSuccess(res, updated, "KYC approved");
  },
);

router.post(
  "/kyc/:id/reject",
  authenticate,
  requirePermission(Permissions.KYC_UPDATE),
  async (req, res) => {
    const id = req.params.id as string;
    const { adminNotes } = req.body;
    const submission = await prisma.kycSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      sendNotFound(res, "KYC submission not found");
      return;
    }
    const updated = await prisma.kycSubmission.update({
      where: { id },
      data: {
        status: "rejected",
        adminNotes,
        reviewedBy: req.user?.userId,
        reviewedAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        title: "KYC Rejected",
        message: adminNotes
          ? `Your identity verification was rejected. Reason: ${adminNotes}`
          : "Your identity verification was rejected. Please resubmit with valid documents.",
        type: "kyc",
      },
    });
    sendSuccess(res, updated, "KYC rejected");
  },
);

router.get(
  "/payments",
  authenticate,
  requirePermission(Permissions.PAYMENTS_READ),
  async (req, res) => {
    const { type, status, page, limit } = req.query;
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    const where: Record<string, string> = {};
    if (type) where.type = String(type);
    if (status) where.status = String(status);

    const [data, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * l,
        take: l,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        data: data.map(mapPayment),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        hasNextPage: p < Math.ceil(total / l),
        hasPreviousPage: p > 1,
      },
      "Payment requests retrieved",
    );
  },
);

router.post(
  "/payments/:id/approve",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  async (req, res) => {
    const id = req.params.id as string;
    const request = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!request) {
      sendNotFound(res, "Payment request not found");
      return;
    }
    if (request.status !== "pending") {
      sendNotFound(res, "Payment request is not pending");
      return;
    }

    const approvedBy = req.user?.userId as string;
    const isDeposit = request.type === "deposit";

    if (!isDeposit) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: request.userId } });
      if (!wallet) {
        sendNotFound(res, "Investor wallet not found");
        return;
      }
      const currentBalance = Number(wallet.balance);
      const withdrawalAmount = Number(request.amount);
      if (currentBalance < withdrawalAmount) {
        sendNotFound(res, `Insufficient balance: ${currentBalance} < ${withdrawalAmount}`);
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedBy: approvedBy,
          reviewedAt: new Date(),
          processedAt: new Date(),
        },
      });

      let wallet;
      if (isDeposit) {
        wallet = await tx.wallet.upsert({
          where: { userId: request.userId },
          create: {
            userId: request.userId,
            balance: request.amount,
          },
          update: {
            balance: { increment: request.amount },
          },
        });
      } else {
        wallet = await tx.wallet.update({
          where: { userId: request.userId },
          data: {
            balance: { decrement: request.amount },
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: isDeposit ? "deposit" : "withdrawal",
          amount: request.amount,
          status: "completed",
          description: isDeposit
            ? `Deposit approved via ${request.method}`
            : `Withdrawal approved via ${request.method}`,
          referenceId: id,
          approvedById: approvedBy,
          approvedAt: new Date(),
        },
      });

      const notificationTitle = isDeposit ? "Deposit Approved" : "Withdrawal Approved";
      const notificationMessage = isDeposit
        ? `Your deposit of ${request.amount} ${request.currency} has been approved and credited to your wallet.`
        : `Your withdrawal of ${request.amount} ${request.currency} has been approved. Funds will be transferred shortly.`;

      await tx.notification.create({
        data: {
          userId: request.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: "wallet",
        },
      });

      return { payment: updatedPayment, transaction };
    });

    sendSuccess(
      res,
      result.payment,
      isDeposit ? "Payment approved and wallet credited" : "Withdrawal approved and wallet debited",
    );
  },
);

router.post(
  "/payments/:id/reject",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  async (req, res) => {
    const id = req.params.id as string;
    const { adminNotes } = req.body;
    const request = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!request) {
      sendNotFound(res, "Payment request not found");
      return;
    }
    if (request.status !== "pending") {
      sendNotFound(res, "Payment request is not pending");
      return;
    }
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: "rejected",
        adminNotes,
        reviewedBy: req.user?.userId,
        reviewedAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: request.type === "deposit" ? "Deposit Rejected" : "Withdrawal Rejected",
        message: adminNotes
          ? `Your ${request.type} of ${request.amount} ${request.currency} was rejected. Reason: ${adminNotes}`
          : `Your ${request.type} of ${request.amount} ${request.currency} was rejected.`,
        type: "wallet",
      },
    });
    sendSuccess(res, updated, "Payment rejected");
  },
);

export default router;

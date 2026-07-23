import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { prisma } from "../../../lib/prisma.js";
import {
  sendSuccess,
  sendNotFound,
  sendError,
} from "../../../common/responses/index.js";

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

const ALLOWED_BUCKETS = ["kyc", "payments", "avatars", "projects"] as const;

const router = Router();

// ─────────────────────────────────────────────
// Existing routes
// ─────────────────────────────────────────────

router.post(
  "/signed-url",
  authenticate,
  requirePermission(Permissions.KYC_READ),
  async (req, res) => {
    try {
      const { bucket, path: filePath } = req.body;
      if (!filePath) {
        sendNotFound(res, "No file path provided");
        return;
      }
      const sanitizedBucket = ALLOWED_BUCKETS.includes(bucket)
        ? bucket
        : (bucket ?? "");
      const fullPath = path.join(UPLOADS_DIR, sanitizedBucket, filePath);
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(UPLOADS_DIR)) {
        sendNotFound(res, "File not found");
        return;
      }
      if (!fs.existsSync(resolved)) {
        sendNotFound(res, "File not found");
        return;
      }
      const fileUrl = `/api/v1/admin/files/${sanitizedBucket}/${filePath}`;
      sendSuccess(res, { url: fileUrl }, "Signed URL generated");
    } catch {
      sendError(res, "Failed to generate signed URL");
    }
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

router.get("/files/:bucket/{*filePath}", authenticate, (req, res) => {
  try {
    const bucketRaw = req.params.bucket;
    const bucket = Array.isArray(bucketRaw) ? bucketRaw[0] : String(bucketRaw ?? "");
    if (!ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
      sendNotFound(res, "File not found");
      return;
    }
    const filePathParam = req.params.filePath;
    const filePath = Array.isArray(filePathParam)
      ? filePathParam.join("/")
      : String(filePathParam ?? "");
    let fullPath = path.join(UPLOADS_DIR, bucket, filePath);
    let resolved = path.resolve(fullPath);
    if (!resolved.startsWith(UPLOADS_DIR)) {
      sendNotFound(res, "File not found");
      return;
    }
    if (!fs.existsSync(resolved) && filePath.startsWith(`${bucket}/`)) {
      fullPath = path.join(UPLOADS_DIR, filePath);
      resolved = path.resolve(fullPath);
      if (!resolved.startsWith(UPLOADS_DIR)) {
        sendNotFound(res, "File not found");
        return;
      }
    }
    if (!fs.existsSync(resolved)) {
      sendNotFound(res, "File not found");
      return;
    }
    const stat = fs.statSync(resolved);
    res.setHeader("Content-Type", getMimeType(resolved));
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(resolved)}"`,
    );
    fs.createReadStream(resolved).pipe(res);
  } catch {
    sendError(res, "Failed to serve file");
  }
});

router.get(
  "/stats",
  authenticate,
  requirePermission(Permissions.USERS_READ),
  async (_req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        investorCount,
        pendingKycCount,
        pendingDeposits,
        pendingWithdrawals,
        totalLands,
        activeHoldings,
        sakPriceResult,
        sakConfigResult,
        activeInvestors,
        approvedKycCount,
        rejectedKycCount,
        walletBalanceResult,
        totalTransactions,
        approvedDeposits,
        approvedWithdrawals,
        totalPaymentVolumeResult,
        monthlyDeposits,
        monthlyWithdrawals,
        monthlyRegistrations,
        totalCountries,
        totalCities,
        totalProjects,
        totalHoldings,
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
        prisma.sakConfig.findFirst({
          orderBy: { effectiveFrom: "desc" },
          select: { sakToGoldRatio: true },
        }),
        prisma.user.count({
          where: { role: { name: "investor" }, status: "active", deletedAt: null },
        }),
        prisma.kycSubmission.count({ where: { status: "approved" } }),
        prisma.kycSubmission.count({ where: { status: "rejected" } }),
        prisma.wallet.aggregate({ _sum: { balance: true } }),
        prisma.transaction.count(),
        prisma.paymentRequest.count({
          where: { type: "deposit", status: "approved" },
        }),
        prisma.paymentRequest.count({
          where: { type: "withdrawal", status: "approved" },
        }),
        prisma.paymentRequest.aggregate({
          where: { status: "approved" },
          _sum: { amount: true },
        }),
        prisma.paymentRequest.count({
          where: {
            type: "deposit",
            status: "approved",
            reviewedAt: { gte: startOfMonth },
          },
        }),
        prisma.paymentRequest.count({
          where: {
            type: "withdrawal",
            status: "approved",
            reviewedAt: { gte: startOfMonth },
          },
        }),
        prisma.user.count({
          where: { createdAt: { gte: startOfMonth }, deletedAt: null },
        }),
        prisma.country.count({ where: { deletedAt: null } }),
        prisma.city.count({ where: { deletedAt: null } }),
        prisma.project.count(),
        prisma.holding.count({ where: { status: "active" } }),
      ]);

      const goldPerGram = Number(sakPriceResult?.gramPriceUsd ?? 0);
      const ratio = Number(sakConfigResult?.sakToGoldRatio ?? 1);
      const sakPrice = goldPerGram * ratio;
      const totalSak = activeHoldings._sum.sakOwned ?? 0;
      const portfolioValueUsd = Number(totalSak) * sakPrice;

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
          activeInvestors,
          approvedKycCount,
          rejectedKycCount,
          walletBalanceSum: Number(walletBalanceResult._sum.balance ?? 0),
          totalTransactions,
          approvedDeposits,
          approvedWithdrawals,
          totalPaymentVolume: Number(totalPaymentVolumeResult._sum.amount ?? 0),
          monthlyDeposits,
          monthlyWithdrawals,
          monthlyRegistrations,
          totalCountries,
          totalCities,
          totalProjects,
          totalHoldings,
        },
        "Admin stats retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve admin stats");
    }
  },
);

router.get(
  "/kyc",
  authenticate,
  requirePermission(Permissions.KYC_READ),
  async (req, res) => {
    try {
      const { status, page, limit } = req.query;
      const p = page ? Math.max(1, Number(page)) : 1;
      const l = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;
      const validStatuses = ["pending", "approved", "rejected"];
      const where =
        status && validStatuses.includes(String(status))
          ? { status: String(status) }
          : {};

      const [data, total] = await Promise.all([
        prisma.kycSubmission.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (p - 1) * l,
          take: l,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
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
    } catch {
      sendError(res, "Failed to retrieve KYC submissions");
    }
  },
);

router.post(
  "/kyc/:id/approve",
  authenticate,
  requirePermission(Permissions.KYC_UPDATE),
  async (req, res) => {
    try {
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
          message:
            "Your identity verification has been approved. You can now access all platform features.",
          type: "kyc",
        },
      });
      sendSuccess(res, updated, "KYC approved");
    } catch {
      sendError(res, "Failed to approve KYC submission");
    }
  },
);

router.post(
  "/kyc/:id/reject",
  authenticate,
  requirePermission(Permissions.KYC_UPDATE),
  async (req, res) => {
    try {
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
          adminNotes: typeof adminNotes === "string" ? adminNotes : null,
          reviewedBy: req.user?.userId,
          reviewedAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId: submission.userId,
          title: "KYC Rejected",
          message:
            typeof adminNotes === "string" && adminNotes
              ? `Your identity verification was rejected. Reason: ${adminNotes}`
              : "Your identity verification was rejected. Please resubmit with valid documents.",
          type: "kyc",
        },
      });
      sendSuccess(res, updated, "KYC rejected");
    } catch {
      sendError(res, "Failed to reject KYC submission");
    }
  },
);

router.get(
  "/payments",
  authenticate,
  requirePermission(Permissions.PAYMENTS_READ),
  async (req, res) => {
    try {
      const { type, status, page, limit } = req.query;
      const p = page ? Math.max(1, Number(page)) : 1;
      const l = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;
      const validStatuses = ["pending", "approved", "rejected"];
      const validTypes = ["deposit", "withdrawal"];
      const where: Record<string, string> = {};
      if (type && validTypes.includes(String(type))) where.type = String(type);
      if (status && validStatuses.includes(String(status)))
        where.status = String(status);

      const [data, total] = await Promise.all([
        prisma.paymentRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (p - 1) * l,
          take: l,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
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
    } catch {
      sendError(res, "Failed to retrieve payment requests");
    }
  },
);

router.post(
  "/payments/:id/approve",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const request = await prisma.paymentRequest.findUnique({
        where: { id },
      });
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
        const wallet = await prisma.wallet.findUnique({
          where: { userId: request.userId },
        });
        if (!wallet) {
          sendNotFound(res, "Investor wallet not found");
          return;
        }
        const currentBalance = Number(wallet.balance);
        const withdrawalAmount = Number(request.amount);
        if (currentBalance < withdrawalAmount) {
          sendNotFound(
            res,
            `Insufficient balance: ${currentBalance} < ${withdrawalAmount}`,
          );
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

        const notificationTitle = isDeposit
          ? "Deposit Approved"
          : "Withdrawal Approved";
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
        isDeposit
          ? "Payment approved and wallet credited"
          : "Withdrawal approved and wallet debited",
      );
    } catch {
      sendError(res, "Failed to approve payment request");
    }
  },
);

router.post(
  "/payments/:id/reject",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const { adminNotes } = req.body;
      const request = await prisma.paymentRequest.findUnique({
        where: { id },
      });
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
          adminNotes: typeof adminNotes === "string" ? adminNotes : null,
          reviewedBy: req.user?.userId,
          reviewedAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId: request.userId,
          title:
            request.type === "deposit"
              ? "Deposit Rejected"
              : "Withdrawal Rejected",
          message:
            typeof adminNotes === "string" && adminNotes
              ? `Your ${request.type} of ${request.amount} ${request.currency} was rejected. Reason: ${adminNotes}`
              : `Your ${request.type} of ${request.amount} ${request.currency} was rejected.`,
          type: "wallet",
        },
      });
      sendSuccess(res, updated, "Payment rejected");
    } catch {
      sendError(res, "Failed to reject payment request");
    }
  },
);

// ─────────────────────────────────────────────
// New Sprint 2.7 routes
// ─────────────────────────────────────────────

router.get(
  "/chart-data",
  authenticate,
  requirePermission(Permissions.USERS_READ),
  async (_req, res) => {
    try {
      const months: string[] = [];
      const deposits: number[] = [];
      const withdrawals: number[] = [];
      const registrations: number[] = [];
      const transactions: number[] = [];

      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push(yearMonth);

        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const [depositSum, withdrawalSum, regCount, txCount] =
          await Promise.all([
            prisma.paymentRequest.aggregate({
              where: {
                type: "deposit",
                status: "approved",
                reviewedAt: { gte: monthStart, lte: monthEnd },
              },
              _sum: { amount: true },
            }),
            prisma.paymentRequest.aggregate({
              where: {
                type: "withdrawal",
                status: "approved",
                reviewedAt: { gte: monthStart, lte: monthEnd },
              },
              _sum: { amount: true },
            }),
            prisma.user.count({
              where: {
                createdAt: { gte: monthStart, lte: monthEnd },
                deletedAt: null,
              },
            }),
            prisma.transaction.count({
              where: {
                createdAt: { gte: monthStart, lte: monthEnd },
              },
            }),
          ]);

        deposits.push(Number(depositSum._sum.amount ?? 0));
        withdrawals.push(Number(withdrawalSum._sum.amount ?? 0));
        registrations.push(regCount);
        transactions.push(txCount);
      }

      sendSuccess(
        res,
        { months, deposits, withdrawals, registrations, transactions },
        "Chart data retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve chart data");
    }
  },
);

router.get(
  "/activity",
  authenticate,
  requirePermission(Permissions.AUDIT_READ),
  async (_req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const activity = logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole ?? "",
        createdAt: log.createdAt.toISOString(),
        success: log.success,
      }));

      sendSuccess(res, activity, "Activity feed retrieved");
    } catch {
      sendError(res, "Failed to retrieve activity feed");
    }
  },
);

router.get(
  "/search",
  authenticate,
  requirePermission(Permissions.USERS_READ),
  async (req, res) => {
    try {
      const q = String(req.query.q ?? "");
      const type = String(req.query.type ?? "all");
      const p = req.query.page ? Number(req.query.page) : 1;
      const l = req.query.limit ? Number(req.query.limit) : 20;

      if (!q) {
        sendSuccess(
          res,
          { data: [], total: 0, page: p, limit: l, totalPages: 0 },
          "Search completed",
        );
        return;
      }

      interface SearchResult {
        id: string;
        type: string;
        title: string;
        subtitle: string;
        status: string;
        createdAt: string;
      }

      const results: SearchResult[] = [];

      const searchInvestors = type === "all" || type === "investors";
      const searchTransactions = type === "all" || type === "transactions";
      const searchKyc = type === "all" || type === "kyc";
      const searchPayments = type === "all" || type === "payments";
      const searchLands = type === "all" || type === "lands";

      if (searchInvestors) {
        const users = await prisma.user.findMany({
          where: {
            role: { name: "investor" },
            deletedAt: null,
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 50,
        });
        for (const u of users) {
          results.push({
            id: u.id,
            type: "investor",
            title: `${u.firstName} ${u.lastName}`,
            subtitle: u.email,
            status: u.status,
            createdAt: u.createdAt.toISOString(),
          });
        }
      }

      if (searchTransactions) {
        const txs = await prisma.transaction.findMany({
          where: {
            description: { contains: q, mode: "insensitive" },
          },
          take: 50,
        });
        for (const tx of txs) {
          results.push({
            id: tx.id,
            type: "transaction",
            title: `${tx.type} — ${tx.amount} SAK`,
            subtitle: tx.description ?? "",
            status: tx.status,
            createdAt: tx.createdAt.toISOString(),
          });
        }
      }

      if (searchKyc) {
        const kyCs = await prisma.kycSubmission.findMany({
          where: {
            OR: [
              {
                user: {
                  email: { contains: q, mode: "insensitive" },
                },
              },
              {
                user: {
                  firstName: { contains: q, mode: "insensitive" },
                },
              },
              {
                user: {
                  lastName: { contains: q, mode: "insensitive" },
                },
              },
            ],
          },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
          take: 50,
        });
        for (const k of kyCs) {
          results.push({
            id: k.id,
            type: "kyc",
            title: `${k.user.firstName} ${k.user.lastName}`,
            subtitle: `${k.documentType} — ${k.user.email}`,
            status: k.status,
            createdAt: k.createdAt.toISOString(),
          });
        }
      }

      if (searchPayments) {
        const pays = await prisma.paymentRequest.findMany({
          where: {
            OR: [
              {
                user: {
                  email: { contains: q, mode: "insensitive" },
                },
              },
              {
                user: {
                  firstName: { contains: q, mode: "insensitive" },
                },
              },
              {
                user: {
                  lastName: { contains: q, mode: "insensitive" },
                },
              },
            ],
          },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
          take: 50,
        });
        for (const py of pays) {
          results.push({
            id: py.id,
            type: "payment",
            title: `${py.type} — ${py.amount} ${py.currency}`,
            subtitle: `${py.user.firstName} ${py.user.lastName}`,
            status: py.status,
            createdAt: py.createdAt.toISOString(),
          });
        }
      }

      if (searchLands) {
        const lands = await prisma.land.findMany({
          where: {
            OR: [
              { titleEn: { contains: q, mode: "insensitive" } },
              { titleAr: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 50,
        });
        for (const l of lands) {
          results.push({
            id: l.id,
            type: "land",
            title: l.titleEn,
            subtitle: l.titleAr,
            status: l.status,
            createdAt: l.createdAt.toISOString(),
          });
        }
      }

      results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const total = results.length;
      const totalPages = Math.ceil(total / l);
      const paginated = results.slice((p - 1) * l, p * l);

      sendSuccess(
        res,
        {
          data: paginated,
          total,
          page: p,
          limit: l,
          totalPages,
        },
        "Search completed",
      );
    } catch {
      sendError(res, "Search failed");
    }
  },
);

router.get(
  "/export/:entity",
  authenticate,
  requirePermission(Permissions.USERS_READ),
  async (req, res) => {
    try {
      const entity = req.params.entity as string;
      const { status, type, from, to } = req.query;

      const where: Record<string, unknown> = {};
      if (status) where.status = String(status);
      if (type) where.type = String(type);
      if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, Date>).gte = new Date(String(from));
        if (to) (where.createdAt as Record<string, Date>).lte = new Date(String(to));
      }

      let rows: Record<string, unknown>[] = [];
      let header: string[] = [];

      switch (entity) {
        case "transactions": {
          const data = await prisma.transaction.findMany({
            where,
            include: { wallet: { select: { userId: true } } },
            orderBy: { createdAt: "desc" },
          });
          header = ["id", "type", "amount", "status", "description", "createdAt"];
          rows = data.map((r) => ({
            id: r.id,
            type: r.type,
            amount: r.amount,
            status: r.status,
            description: r.description ?? "",
            createdAt: r.createdAt.toISOString(),
          }));
          break;
        }
        case "investors": {
          const data = await prisma.user.findMany({
            where: { ...where, role: { name: "investor" }, deletedAt: null },
            orderBy: { createdAt: "desc" },
          });
          header = ["id", "email", "firstName", "lastName", "status", "createdAt"];
          rows = data.map((r) => ({
            id: r.id,
            email: r.email,
            firstName: r.firstName,
            lastName: r.lastName,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }));
          break;
        }
        case "payments": {
          const data = await prisma.paymentRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
          });
          header = ["id", "type", "amount", "status", "method", "createdAt"];
          rows = data.map((r) => ({
            id: r.id,
            type: r.type,
            amount: r.amount,
            status: r.status,
            method: r.method,
            createdAt: r.createdAt.toISOString(),
          }));
          break;
        }
        case "kyc": {
          const data = await prisma.kycSubmission.findMany({
            where,
            orderBy: { createdAt: "desc" },
          });
          header = ["id", "userId", "documentType", "status", "createdAt"];
          rows = data.map((r) => ({
            id: r.id,
            userId: r.userId,
            documentType: r.documentType,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }));
          break;
        }
        case "wallets": {
          const data = await prisma.wallet.findMany({
            where: { ...(where.status ? { status: where.status as never } : {}) },
            orderBy: { createdAt: "desc" },
          });
          header = ["id", "userId", "balance", "frozenBalance", "status"];
          rows = data.map((r) => ({
            id: r.id,
            userId: r.userId,
            balance: r.balance,
            frozenBalance: r.frozenBalance,
            status: r.status,
          }));
          break;
        }
        default: {
          sendNotFound(res, `Unknown entity: ${entity}`);
          return;
        }
      }

      const escapeCsv = (val: unknown): string => {
        const str = String(val ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        header.join(","),
        ...rows.map((row) => header.map((h) => escapeCsv(row[h])).join(",")),
      ];
      const csv = csvLines.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${entity}-export.csv"`,
      );
      res.send(csv);
    } catch {
      sendError(res, `Failed to export ${req.params.entity}`);
    }
  },
);

export default router;

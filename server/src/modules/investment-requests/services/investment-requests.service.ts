import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError, ConflictError, AppError } from "../../../lib/errors.js";
import { toDecimal } from "../../../lib/money.js";
import { pricingService } from "../../../services/pricing.service.js";
import {
  createNotificationIfPreferred,
  type PreferrableClient,
} from "../../notifications/services/notification-preference.service.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { commissionsService } from "../../commissions/services/commissions.service.js";
import { roundMoney } from "../../../lib/money.js";
import { logger } from "../../../lib/logger.js";

const log = logger.child({ context: "InvestmentRequestsService" });

const ACTIVE_STATUSES = ["submitted", "under_review", "approved"];

const INVESTMENT_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "invested",
  "failed",
];

const TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "approved", "rejected", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["invested", "cancelled", "failed"],
  rejected: [],
  cancelled: [],
  invested: [],
  failed: [],
};

export type ActorRole = "client" | "broker" | "admin";

const BROKER_ALLOWED_FROM = {
  submitted: ["under_review"],
  under_review: ["under_review", "rejected"],
};

// Task 6: manual payment lifecycle attached to the investment request.
export const INVESTMENT_PAYMENT_STATUSES = {
  PENDING: "payment_pending",
  PROOF_UPLOADED: "proof_uploaded",
  UNDER_REVIEW: "payment_under_review",
  CONFIRMED: "payment_confirmed",
  REJECTED: "payment_rejected",
} as const;

const PROOF_UPLOAD_ALLOWED_FROM: string[] = [
  INVESTMENT_PAYMENT_STATUSES.PENDING,
  INVESTMENT_PAYMENT_STATUSES.REJECTED,
];
const PAYMENT_REVIEW_ALLOWED_FROM: string[] = [
  INVESTMENT_PAYMENT_STATUSES.PROOF_UPLOADED,
  INVESTMENT_PAYMENT_STATUSES.UNDER_REVIEW,
];

const TRANSITION_AUDIT_ACTION: Record<string, string> = {
  under_review: AuditActions.INVESTMENT_REQUEST_UNDER_REVIEW,
  approved: AuditActions.INVESTMENT_REQUEST_APPROVED,
  rejected: AuditActions.INVESTMENT_REQUEST_REJECTED,
  cancelled: AuditActions.INVESTMENT_CANCELLED,
  invested: AuditActions.INVESTMENT_EXECUTED,
  failed: AuditActions.INVESTMENT_FAILED,
};

async function notifyAdmins(client: PreferrableClient, title: string, message: string) {
  const admins = await client.user.findMany({
    where: { role: { name: { in: ["admin", "super_admin"] } }, deletedAt: null },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotificationIfPreferred(client, {
      userId: admin.id,
      title,
      message,
      type: "system",
    });
  }
}

export class InvestmentRequestsService {
  async create(
    userId: string,
    input: { landId: string; amountUsd: number; brokerId?: string | null; source?: string },
  ) {
    if (!input.landId) throw new ValidationError("Asset is required");
    const amount = toDecimal(Number(input.amountUsd));
    if (!amount.greaterThan(0)) throw new ValidationError("Amount must be positive");

    const land = await prisma.land.findUnique({ where: { id: input.landId } });
    if (!land) throw new NotFoundError("Asset not found");

    let brokerId: string | null = null;
    let source: string;
    if (input.source === "marketplace") {
      source = "marketplace";
    } else if (input.source === "broker" || input.brokerId) {
      source = "broker";
    } else {
      source = "platform";
    }

    if (source === "broker") {
      if (!input.brokerId)
        throw new ValidationError("Broker is required for broker-led investment");
      const broker = await prisma.brokerProfile.findUnique({ where: { id: input.brokerId } });
      if (!broker || broker.verificationStatus !== "verified" || !broker.isActive) {
        throw new ValidationError("Selected broker is not active");
      }
      brokerId = broker.id;
    }

    let paymentStatus: string = INVESTMENT_PAYMENT_STATUSES.PENDING;
    let paymentMethod: string | null = null;

    // Marketplace source: funds come from the investor's wallet SAK balance (pre-cleared
    // via prior deposit/payment-request flow). Validate balance and auto-confirm payment.
    if (source === "marketplace") {
      const price = await pricingService.getCurrentSakPrice();
      const sakQty = Math.floor(Number(toDecimal(amount.toString()).dividedBy(price)));
      if (sakQty < 1)
        throw new ValidationError("Amount is below the minimum investable SAK quantity");

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundError("Wallet not found");
      const availableSak = wallet.balance.sub(wallet.frozenBalance);
      if (availableSak.lessThan(sakQty)) {
        throw new AppError(
          "Insufficient wallet SAK balance for this purchase",
          400,
          true,
          "INSUFFICIENT_BALANCE",
        );
      }
      paymentStatus = INVESTMENT_PAYMENT_STATUSES.CONFIRMED;
      paymentMethod = "wallet";
    }

    // Idempotency guard: no duplicate ACTIVE request for same investor+asset.
    const dup = await prisma.investmentRequest.findFirst({
      where: { userId, landId: input.landId, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
    });
    if (dup) throw new ConflictError("An active investment request already exists for this asset");

    const request = await prisma.investmentRequest.create({
      data: {
        userId,
        landId: input.landId,
        brokerId,
        amountUsd: amount,
        source,
        status: "submitted",
        paymentStatus,
        paymentMethod,
      },
    });

    await createNotificationIfPreferred(prisma, {
      userId,
      title: "تم استلام طلب الاستثمار الخاص بك",
      message: "سيقوم فريقنا بمراجعة طلبك وإعلامك بالخطوة التالية.",
      type: "investment",
    });
    if (brokerId) {
      const b = await prisma.brokerProfile.findUnique({
        where: { id: brokerId },
        select: { userId: true },
      });
      if (b) {
        await createNotificationIfPreferred(prisma, {
          userId: b.userId,
          title: "طلب استثمار جديد",
          message: "تم إسناد طلب استثمار جديد إليك للمراجعة.",
          type: "investment",
        });
      }
    }
    await notifyAdmins(
      prisma,
      "طلب استثمار جديد",
      `تم استلام طلب استثمار جديد بقيمة ${amount.toString()} USD — بانتظار الدفع والمراجعة.`,
    );
    await auditService.log({
      actorId: userId,
      actorEmail: userId,
      actorRole: "investor",
      action: AuditActions.INVESTMENT_REQUEST_CREATED,
      entityType: "investment_request",
      entityId: request.id,
      newValues: { status: request.status, paymentStatus: request.paymentStatus },
      success: true,
    });

    return request;
  }

  private scopeFor(actorRole: ActorRole, userId: string) {
    if (actorRole === "admin") return {};
    if (actorRole === "broker") {
      return { broker: { userId } };
    }
    return { userId };
  }

  async list(
    actorRole: ActorRole,
    userId: string,
    filters: { status?: string; source?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const where: Prisma.InvestmentRequestWhereInput = this.scopeFor(actorRole, userId);
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;

    const [total, rows] = await Promise.all([
      prisma.investmentRequest.count({ where }),
      prisma.investmentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          land: {
            select: { id: true, titleAr: true, coverImageUrl: true, totalSakInventory: true },
          },
          broker: { select: { id: true, displayName: true } },
          investor: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
        },
      }),
    ]);
    return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async stats(actorRole: ActorRole, userId: string) {
    const where: Prisma.InvestmentRequestWhereInput = this.scopeFor(actorRole, userId);

    const [total, grouped] = await Promise.all([
      prisma.investmentRequest.count({ where }),
      prisma.investmentRequest.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amountUsd: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byStatusUsd: Record<string, string> = {};
    let totalUsd = toDecimal(0);
    let investedUsd = toDecimal(0);
    let pending = 0;
    let active = 0;

    for (const status of INVESTMENT_STATUSES) {
      byStatus[status] = 0;
      byStatusUsd[status] = "0.00";
    }

    for (const g of grouped) {
      const count = g._count._all;
      const sum = toDecimal(g._sum.amountUsd?.toString() ?? "0");
      byStatus[g.status] = count;
      byStatusUsd[g.status] = sum.toString();
      totalUsd = totalUsd.plus(sum);
      if (g.status === "invested") investedUsd = investedUsd.plus(sum);
      if (g.status === "submitted" || g.status === "under_review") pending += count;
      if (ACTIVE_STATUSES.includes(g.status)) active += count;
    }

    return {
      total,
      byStatus,
      byStatusUsd: { ...byStatusUsd },
      pending,
      active,
      invested: byStatus.invested ?? 0,
      totalUsd: totalUsd.toString(),
      investedUsd: investedUsd.toString(),
    };
  }

  async getById(actorRole: ActorRole, userId: string, id: string) {
    const request = await prisma.investmentRequest.findUnique({
      where: { id },
      include: {
        land: {
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            expectedRoi: true,
            coverImageUrl: true,
          },
        },
        broker: { select: { id: true, displayName: true, company: true } },
        investor: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
        holding: { select: { sakOwned: true } },
      },
    });
    if (!request) throw new NotFoundError("Investment request not found");

    if (actorRole === "client" && request.userId !== userId)
      throw new AppError("Forbidden", 403, true, "FORBIDDEN");
    if (actorRole === "broker") {
      const own = request.brokerId != null && (await this.isBrokerOwner(request.brokerId, userId));
      if (!own) throw new AppError("Forbidden", 403, true, "FORBIDDEN");
    }
    return request;
  }

  private async isBrokerOwner(brokerId: string | null, userId: string) {
    if (!brokerId) return false;
    const b = await prisma.brokerProfile.findUnique({
      where: { id: brokerId },
      select: { userId: true },
    });
    return b?.userId === userId;
  }

  /**
   * Task 6 — Step 3: investor uploads/replaces manual payment proof.
   * Only the owning investor, only while the request is still pending,
   * and only when payment is still pending or was rejected (replace flow).
   */
  async uploadPaymentProof(
    actorRole: ActorRole,
    userId: string,
    id: string,
    input: { proofPath: string; paymentMethod?: string | null },
  ) {
    if (!input.proofPath) throw new ValidationError("Payment proof is required");
    const request = await prisma.investmentRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError("Investment request not found");

    if (actorRole !== "client" || request.userId !== userId) {
      throw new AppError("Forbidden", 403, true, "FORBIDDEN");
    }
    if (!["submitted", "under_review"].includes(request.status)) {
      throw new ConflictError(
        "Payment proof can only be uploaded while the request is still pending",
      );
    }
    if (!PROOF_UPLOAD_ALLOWED_FROM.includes(request.paymentStatus)) {
      throw new ConflictError("A payment proof is already under review or confirmed");
    }

    const updated = await prisma.investmentRequest.update({
      where: { id },
      data: {
        paymentProofPath: input.proofPath,
        paymentProofUploadedAt: new Date(),
        paymentMethod: input.paymentMethod ?? request.paymentMethod ?? "bank_transfer",
        paymentStatus: INVESTMENT_PAYMENT_STATUSES.PROOF_UPLOADED,
        paymentNote: null,
        paymentReviewedBy: null,
        paymentReviewedAt: null,
      },
    });

    await createNotificationIfPreferred(prisma, {
      userId,
      title: "تم استلام إثبات الدفع",
      message: `تم رفع إثبات الدفع لطلب الاستثمار رقم #${id.slice(0, 8)} وسيتم مراجعته من الإدارة.`,
      type: "investment",
    });
    await notifyAdmins(
      prisma,
      "إثبات دفع بانتظار المراجعة",
      `تم رفع إثبات دفع لطلب الاستثمار رقم #${id.slice(0, 8)} — يرجى مراجعته.`,
    );
    await auditService.log({
      actorId: userId,
      actorEmail: userId,
      actorRole: "investor",
      action: AuditActions.INVESTMENT_PAYMENT_PROOF_UPLOADED,
      entityType: "investment_request",
      entityId: id,
      oldValues: { paymentStatus: request.paymentStatus },
      newValues: { paymentStatus: INVESTMENT_PAYMENT_STATUSES.PROOF_UPLOADED },
      success: true,
    });

    return updated;
  }

  /** Task 6 — admin confirms the manual payment proof. */
  async confirmPayment(actorRole: ActorRole, userId: string, id: string, note?: string) {
    if (actorRole !== "admin") throw new AppError("Forbidden", 403, true, "FORBIDDEN");
    const request = await prisma.investmentRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError("Investment request not found");
    if (!PAYMENT_REVIEW_ALLOWED_FROM.includes(request.paymentStatus)) {
      throw new ConflictError("No payment proof awaiting review for this request");
    }

    const updated = await prisma.investmentRequest.update({
      where: { id },
      data: {
        paymentStatus: INVESTMENT_PAYMENT_STATUSES.CONFIRMED,
        paymentReviewedBy: userId,
        paymentReviewedAt: new Date(),
        paymentNote: note ? note.slice(0, 500) : null,
      },
    });

    await createNotificationIfPreferred(prisma, {
      userId: request.userId,
      title: "تم تأكيد الدفع",
      message: `تم تأكيد استلام المبلغ لطلب الاستثمار رقم #${id.slice(0, 8)} — جارٍ اعتماد الاستثمار.`,
      type: "investment",
    });
    await auditService.log({
      actorId: userId,
      actorEmail: userId,
      actorRole: "admin",
      action: AuditActions.INVESTMENT_PAYMENT_CONFIRMED,
      entityType: "investment_request",
      entityId: id,
      oldValues: { paymentStatus: request.paymentStatus },
      newValues: { paymentStatus: INVESTMENT_PAYMENT_STATUSES.CONFIRMED },
      success: true,
    });

    return updated;
  }

  /** Task 6 — admin rejects the manual payment proof (reason required). */
  async rejectPayment(actorRole: ActorRole, userId: string, id: string, reason?: string) {
    if (actorRole !== "admin") throw new AppError("Forbidden", 403, true, "FORBIDDEN");
    if (!reason?.trim()) throw new ValidationError("Rejection reason is required");
    const request = await prisma.investmentRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError("Investment request not found");
    if (!PAYMENT_REVIEW_ALLOWED_FROM.includes(request.paymentStatus)) {
      throw new ConflictError("No payment proof awaiting review for this request");
    }

    const updated = await prisma.investmentRequest.update({
      where: { id },
      data: {
        paymentStatus: INVESTMENT_PAYMENT_STATUSES.REJECTED,
        paymentReviewedBy: userId,
        paymentReviewedAt: new Date(),
        paymentNote: reason.trim().slice(0, 500),
      },
    });

    await createNotificationIfPreferred(prisma, {
      userId: request.userId,
      title: "تم رفض إثبات الدفع",
      message: `تم رفض إثبات الدفع الخاص بطلب الاستثمار رقم #${id.slice(0, 8)}. السبب: ${reason.trim().slice(0, 300)}`,
      type: "investment",
    });
    await auditService.log({
      actorId: userId,
      actorEmail: userId,
      actorRole: "admin",
      action: AuditActions.INVESTMENT_PAYMENT_REJECTED,
      entityType: "investment_request",
      entityId: id,
      oldValues: { paymentStatus: request.paymentStatus },
      newValues: {
        paymentStatus: INVESTMENT_PAYMENT_STATUSES.REJECTED,
        reason: reason.trim().slice(0, 500),
      },
      success: true,
    });

    return updated;
  }

  async transition(
    actorRole: ActorRole,
    userId: string,
    id: string,
    input: { status: string; note?: string },
  ) {
    const request = await prisma.investmentRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError("Investment request not found");

    if (actorRole === "client") {
      if (request.userId !== userId) {
        throw new AppError("Forbidden", 403, true, "FORBIDDEN");
      }
      if (input.status !== "cancelled" || !["submitted", "under_review"].includes(request.status)) {
        throw new AppError("Client may only cancel a pending request", 403, true, "FORBIDDEN");
      }
    } else if (actorRole === "broker") {
      const brokerAllowed = (BROKER_ALLOWED_FROM as Record<string, string[]>)[request.status] ?? [];
      if (!brokerAllowed.includes(input.status)) {
        throw new AppError("Broker may not perform this transition", 403, true, "FORBIDDEN");
      }
      if (!request.brokerId || !(await this.isBrokerOwner(request.brokerId, userId))) {
        throw new AppError("Forbidden", 403, true, "FORBIDDEN");
      }
    }

    const allowed = TRANSITIONS[request.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new ValidationError(`Cannot transition from ${request.status} to ${input.status}`);
    }

    // Task 6 business rule: an investment can only be approved after its payment
    // has been confirmed. Approval is what unlocks execution (invested).
    if (
      input.status === "approved" &&
      request.paymentStatus !== INVESTMENT_PAYMENT_STATUSES.CONFIRMED
    ) {
      throw new ConflictError("Payment must be confirmed before approving the investment request");
    }
    // Task 6: rejecting a request always requires a persisted reason.
    if (input.status === "rejected" && !input.note?.trim()) {
      throw new ValidationError("Rejection reason is required");
    }

    return prisma.$transaction(async (tx) => {
      let holdingId = request.holdingId;
      if (input.status === "invested") {
        // Idempotent execution: atomically claim approved -> invested exactly once.
        // A concurrent/duplicate execute finds count = 0 and returns the existing
        // record instead of creating a second holding.
        const claim = await tx.investmentRequest.updateMany({
          where: { id, status: "approved", holdingId: null },
          data: { status: "invested", reviewedBy: userId, reviewedAt: new Date() },
        });
        if (claim.count === 0) {
          const existing = await tx.investmentRequest.findUnique({ where: { id } });
          if (existing?.status === "invested" && existing.holdingId) {
            return existing;
          }
          throw new ConflictError("Investment request cannot be executed in its current state");
        }
        const price = await pricingService.getCurrentSakPriceOrNull();
        if (!price) throw new AppError("SAK price unavailable", 503, true, "PRICE_UNAVAILABLE");
        const sakQty = Math.floor(Number(toDecimal(request.amountUsd.toString()).dividedBy(price)));
        if (sakQty < 1)
          throw new ValidationError("Amount is below the minimum investable SAK quantity");
        const land = await tx.land.findUnique({ where: { id: request.landId } });
        if (!land || !["active", "partially_sold"].includes(land.status)) {
          throw new AppError("Asset is not available for investment", 409, true, "INVALID_STATUS");
        }
        if (Number(land.availableSak) < sakQty) {
          throw new AppError("Insufficient inventory", 409, true, "INSUFFICIENT_INVENTORY");
        }
        // Execute through the existing financial flow: decrement inventory + holding + transaction + order.
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + land.maturityMonths);
        const holding = await tx.holding.create({
          data: {
            userId: request.userId,
            landId: request.landId,
            brokerId: request.brokerId,
            sakOwned: sakQty,
            purchasePricePerSakUsd: price,
            maturityDate,
            status: "active",
          },
        });
        await tx.land.update({
          where: { id: land.id },
          data: {
            availableSak: { decrement: sakQty },
            status:
              Number(land.availableSak) - sakQty === 0
                ? "sold_out"
                : land.status === "active"
                  ? "partially_sold"
                  : land.status,
          },
        });
        holdingId = holding.id;

        // Marketplace source: wallet SAK was pre-validated at create-time;
        // now that the holding is committed, deduct the SAK and record the
        // financial ledger entries (transaction + order) + trigger commissions.
        if (request.source === "marketplace") {
          const lockedWallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
          if (!lockedWallet) {
            throw new AppError("Wallet not found", 404, true, "WALLET_NOT_FOUND");
          }
          const availableSak = lockedWallet.balance.sub(lockedWallet.frozenBalance);
          if (availableSak.lessThan(sakQty)) {
            throw new AppError(
              "Insufficient wallet SAK balance for this purchase",
              409,
              true,
              "INSUFFICIENT_BALANCE",
            );
          }

          const subtotalUsd = toDecimal(sakQty).mul(price);
          const txRecord = await tx.transaction.create({
            data: {
              walletId: lockedWallet.id,
              type: "buy",
              amount: sakQty,
              status: "completed",
              description: `شراء ${sakQty} وحدة SAK من الأصل ${land.titleAr}`,
              direction: "debit",
              unit: "SAK",
              usdAmount: subtotalUsd,
              sakAmount: sakQty,
              pricePerSakUsd: price,
              holdingId: holding.id,
            },
          });

          await tx.order.create({
            data: {
              userId: request.userId,
              landId: request.landId,
              walletId: lockedWallet.id,
              holdingId: holding.id,
              transactionId: txRecord.id,
              type: "buy",
              status: "completed",
              direction: "buy",
              sakQuantity: sakQty,
              unitPriceUsd: price,
              subtotalUsd: roundMoney(subtotalUsd, 8),
              feeSak: toDecimal(0),
              feeUsd: toDecimal(0),
              totalUsd: roundMoney(subtotalUsd, 8),
              completedAt: txRecord.createdAt,
            },
          });

          await tx.wallet.update({
            where: { userId: request.userId },
            data: { balance: { decrement: sakQty } },
          });

          // Idempotent commission triggers after the investment is committed.
          try {
            await commissionsService.calculateCommission(holding.id, "referral");
          } catch (err: any) {
            log.error("Referral commission trigger failed", { error: err.message });
          }
          try {
            await commissionsService.calculateCommission(holding.id, "broker");
          } catch (err: any) {
            log.error("Broker commission trigger failed", { error: err.message });
          }
        }
      }

      const updated = await tx.investmentRequest.update({
        where: { id },
        data: {
          status: input.status,
          reviewNote: input.note ? input.note.slice(0, 500) : null,
          rejectionReason:
            input.status === "rejected"
              ? input.note!.trim().slice(0, 500)
              : request.rejectionReason,
          reviewedBy:
            input.status === "invested" || input.status === "rejected"
              ? userId
              : request.reviewedBy,
          reviewedAt:
            input.status === "invested" || input.status === "rejected"
              ? new Date()
              : request.reviewedAt,
          holdingId,
        },
      });

      if (input.status === "invested") {
        await createNotificationIfPreferred(tx, {
          userId: request.userId,
          title: "اكتمل استثمارك",
          message: "تم تنفيذ استثمارك بنجاح على هذا الأصل وأصبح ضمن استثماراتك النشطة.",
          type: "investment",
        });
      } else if (input.status === "rejected") {
        await createNotificationIfPreferred(tx, {
          userId: request.userId,
          title: "تم رفض طلب الاستثمار",
          message: `تم رفض طلب الاستثمار الخاص بك. السبب: ${input.note!.trim().slice(0, 300)}`,
          type: "investment",
        });
      }

      // Notify the originating broker about final outcomes on their requests.
      if ((input.status === "invested" || input.status === "rejected") && request.brokerId) {
        const broker = await tx.brokerProfile.findUnique({
          where: { id: request.brokerId },
          select: { userId: true },
        });
        if (broker) {
          await createNotificationIfPreferred(tx, {
            userId: broker.userId,
            title: "تحديث حالة طلب استثمار",
            message:
              input.status === "invested"
                ? `تم تنفيذ طلب الاستثمار رقم #${id.slice(0, 8)} المسند إليك.`
                : `تم رفض طلب الاستثمار رقم #${id.slice(0, 8)} المسند إليك.`,
            type: "investment",
          });
        }
      }

      await auditService.log({
        actorId: userId,
        actorEmail: userId,
        actorRole: actorRole,
        action: TRANSITION_AUDIT_ACTION[input.status] ?? AuditActions.BOOKING_UPDATED,
        entityType: "investment_request",
        entityId: id,
        oldValues: { status: request.status, paymentStatus: request.paymentStatus },
        newValues: {
          status: input.status,
          holdingId,
          ...(input.note ? { note: input.note.slice(0, 500) } : {}),
        },
        success: true,
      });

      return updated;
    });
  }
}

export const investmentRequestsService = new InvestmentRequestsService();

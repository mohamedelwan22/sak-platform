import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { AppError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { toDecimal } from "../../../lib/money.js";
import { createNotificationIfPreferred } from "../../notifications/services/notification-preference.service.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { logger } from "../../../lib/logger.js";

const REFERRAL_CODE_LENGTH = 8;

const log = logger.child({ context: "AffiliateService" });

export class AffiliateService {
  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(_userId?: string): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateRandomCode();
      const existing = await prisma.affiliateRelation.findFirst({
        where: { referralCode: code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new AppError("Failed to generate unique referral code", 500);
    }

    return code;
  }

  /**
   * Get or create referral link for a user
   */
  async getReferralLink(userId: string): Promise<{
    referralCode: string;
    referralLink: string;
    createdAt: Date;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    let relation = await prisma.affiliateRelation.findUnique({
      where: { referredId: userId },
    });

    if (!relation) {
      const code = await this.generateReferralCode(userId);
      relation = await prisma.affiliateRelation.create({
        data: {
          referrerId: userId,
          referredId: userId,
          referralCode: code,
        },
      });
    }

    const referralLink = `${process.env.APP_URL || "https://sak100.com"}/signup?ref=${relation.referralCode}`;

    return {
      referralCode: relation.referralCode,
      referralLink,
      createdAt: relation.createdAt,
    };
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string): Promise<{
    referralCode: string;
    referredCount: number;
    totalCommissionsUsd: string;
    pendingCommissionsUsd: string;
    approvedCommissionsUsd: string;
    paidCommissionsUsd: string;
  }> {
    const relation = await prisma.affiliateRelation.findUnique({
      where: { referredId: userId },
    });

    if (!relation) {
      return {
        referralCode: "",
        referredCount: 0,
        totalCommissionsUsd: "0.00",
        pendingCommissionsUsd: "0.00",
        approvedCommissionsUsd: "0.00",
        paidCommissionsUsd: "0.00",
      };
    }

    const [referredCount, commissions] = await Promise.all([
      prisma.affiliateRelation.count({
        where: {
          referrerId: userId,
          referredId: { not: userId },
        },
      }),
      prisma.affiliateCommission.findMany({
        where: { beneficiaryId: userId },
      }),
    ]);

    let totalUsd = toDecimal(0);
    let pendingUsd = toDecimal(0);
    let approvedUsd = toDecimal(0);
    let paidUsd = toDecimal(0);

    for (const comm of commissions) {
      const amount = toDecimal(comm.commissionUsd);
      totalUsd = totalUsd.plus(amount);

      switch (comm.status) {
        case "pending":
          pendingUsd = pendingUsd.plus(amount);
          break;
        case "approved":
          approvedUsd = approvedUsd.plus(amount);
          break;
        case "paid":
          paidUsd = paidUsd.plus(amount);
          break;
      }
    }

    return {
      referralCode: relation.referralCode,
      referredCount,
      totalCommissionsUsd: totalUsd.toFixed(2),
      pendingCommissionsUsd: pendingUsd.toFixed(2),
      approvedCommissionsUsd: approvedUsd.toFixed(2),
      paidCommissionsUsd: paidUsd.toFixed(2),
    };
  }

  /**
   * Get paginated commission history for the authenticated user
   */
  async getCommissions(
    userId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const status = filters.status;

    const where: Prisma.AffiliateCommissionWhereInput = { beneficiaryId: userId };
    if (status) {
      where.status = status;
    }

    const [total, commissions] = await Promise.all([
      prisma.affiliateCommission.count({ where }),
      prisma.affiliateCommission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: commissions.map((c) => ({
        id: c.id,
        holdingId: c.holdingId,
        commissionType: c.commissionType,
        baseAmountUsd: c.baseAmountUsd.toFixed(2),
        ratePercent: c.ratePercent.toFixed(4),
        commissionUsd: c.commissionUsd.toFixed(2),
        commissionSak: c.commissionSak.toFixed(4),
        status: c.status,
        approvedAt: c.approvedAt,
        paidAt: c.paidAt,
        payoutId: c.payoutId,
        createdAt: c.createdAt,
      })),
      pagination: { page, limit, total, totalPages },
    };
  }

  /**
   * Request commission withdrawal — atomic payout.
   * All financial mutations happen inside a single DB transaction.
   */
  async requestWithdrawal(
    userId: string,
    commissionIds: string[]
  ): Promise<{
    withdrawalId: string;
    payoutId: string;
    totalAmountUsd: string;
    totalAmountSak: string;
    commissionCount: number;
    status: string;
    createdAt: Date;
  }> {
    if (!commissionIds || commissionIds.length === 0) {
      throw new ValidationError("At least one commission must be selected");
    }

    const idSet = new Set(commissionIds);
    if (idSet.size !== commissionIds.length) {
      throw new ValidationError("Duplicate commission IDs are not allowed");
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // Lock the wallet row for the payout to prevent double-spend races.
      await tx.$queryRaw`SELECT id FROM "wallets" WHERE user_id = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new NotFoundError("User wallet not found");
      }

      // Fetch the requested commissions owned by this beneficiary.
      const commissions = await tx.affiliateCommission.findMany({
        where: { id: { in: commissionIds }, beneficiaryId: userId },
      });

      if (commissions.length !== commissionIds.length) {
        throw new ValidationError("Some commissions not found or not owned by user");
      }

      const notApproved = commissions.filter((c) => c.status !== "approved");
      if (notApproved.length > 0) {
        throw new ValidationError(
          `${notApproved.length} commission(s) are not approved for withdrawal`
        );
      }

      let totalUsd = toDecimal(0);
      let totalSak = toDecimal(0);
      for (const commission of commissions) {
        totalUsd = totalUsd.plus(commission.commissionUsd);
        totalSak = totalSak.plus(commission.commissionSak);
      }

      // Create the wallet transaction for the payout.
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "profit_distribution",
          amount: totalSak,
          status: "approved",
          description: `Commission payout: ${commissions.length} approved commission(s)`,
          direction: "credit",
          unit: "SAK",
          sakAmount: totalSak,
          usdAmount: totalUsd,
        },
      });

      // Create a payout batch covering one or many commissions.
      const payout = await tx.commissionPayout.create({
        data: {
          beneficiaryId: userId,
          transactionId: transaction.id,
          totalUsd,
          totalSak,
          status: "completed",
        },
      });

      // Credit the wallet.
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: totalSak } },
      });

      // Mark commissions paid with the payout reference.
      await tx.affiliateCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: {
          status: "paid",
          paidAt: new Date(),
          payoutId: payout.id,
        },
      });

      return { transaction, payout, totalUsd, totalSak };
    });

    // Best-effort audit + notification (must not break the request).
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, role: { select: { name: true } } },
      });
      await auditService.log({
        actorId: userId,
        actorEmail: user?.email ?? userId,
        actorRole: user?.role?.name ?? "investor",
        action: AuditActions.REFERRAL_WITHDRAWAL_REQUESTED,
        entityType: "commission_payout",
        entityId: outcome.payout.id,
        success: true,
      });
    } catch (err) {
      log.error("Failed to audit commission payout", { error: err });
    }

    try {
      await createNotificationIfPreferred(prisma, {
        userId,
        title: "Commission Withdrawal Processed",
        message: `${commissionIds.length} commission(s) totaling ${outcome.totalUsd.toFixed(2)} USD have been withdrawn to your wallet`,
        type: "system",
      });
    } catch (err) {
      log.error("Failed to send payout notification", { error: err });
    }

    return {
      withdrawalId: outcome.transaction.id,
      payoutId: outcome.payout.id,
      totalAmountUsd: outcome.totalUsd.toFixed(2),
      totalAmountSak: outcome.totalSak.toFixed(4),
      commissionCount: commissionIds.length,
      status: "completed",
      createdAt: outcome.transaction.createdAt,
    };
  }

  /**
   * Apply referral code — establish referrer relationship during signup.
   * Prevents self-referrals and duplicates.
   */
  async applyReferralCode(newUserId: string, referralCode: string): Promise<void> {
    if (!referralCode || referralCode.trim().length === 0) {
      return;
    }

    const relation = await prisma.affiliateRelation.findFirst({
      where: { referralCode },
    });

    if (!relation) {
      log.warn(`Invalid referral code applied: ${referralCode}`);
      return;
    }

    if (relation.referrerId === newUserId) {
      log.warn(`Self-referral rejected for user ${newUserId}`);
      return;
    }

    const existing = await prisma.affiliateRelation.findUnique({
      where: { referredId: newUserId },
    });
    if (existing) {
      log.warn(`User ${newUserId} already has a referral relation; skipping`);
      return;
    }

    await prisma.affiliateRelation.create({
      data: {
        referrerId: relation.referrerId,
        referredId: newUserId,
        referralCode: await this.generateReferralCode(newUserId),
      },
    });
  }

  // Private helpers
  private generateRandomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const affiliateService = new AffiliateService();
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { toDecimal } from "../../../lib/money.js";
import { AppError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { pricingService } from "../../../services/pricing.service.js";

export class CommissionsService {
  /**
   * Calculate and create commission for a holding (investment)
   * Called when investment is completed - ensures idempotency via unique constraint
   */
  async calculateCommission(
    holdingId: string,
    commissionType: string = "referral"
  ): Promise<{
    created: boolean;
    commission: any;
  }> {
    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      include: {
        user: { select: { id: true, email: true } },
        land: { select: { id: true } },
      },
    });

    if (!holding) {
      throw new NotFoundError("Holding not found");
    }

    const baseAmountUsd = holding.purchasePricePerSakUsd.times(holding.sakOwned);

    const sakPrice = await pricingService.getCurrentSakPriceOrNull();
    if (!sakPrice) {
      throw new AppError("Cannot calculate commission: SAK price unavailable", 503);
    }

    const rate = await this.getCommissionRate(commissionType, holding.land?.id, holding.brokerId ?? undefined);
    if (!rate) {
      throw new AppError("No commission rate configured", 500);
    }

    const commissionUsd = baseAmountUsd.times(rate.ratePercent).dividedBy(100);
    const commissionSak = commissionUsd.dividedBy(sakPrice);

    let beneficiaryId: string;
    let brokerId: string | null = null;

    if (commissionType === "referral") {
      const referral = await prisma.affiliateRelation.findUnique({
        where: { referredId: holding.userId },
      });

      if (!referral) {
        return { created: false, commission: null };
      }

      beneficiaryId = referral.referrerId;
    } else if (commissionType === "broker") {
      if (!holding.brokerId) {
        return { created: false, commission: null };
      }

      const broker = await prisma.brokerProfile.findUnique({
        where: { id: holding.brokerId },
      });

      if (!broker) {
        return { created: false, commission: null };
      }

      beneficiaryId = broker.userId;
      brokerId = holding.brokerId;
    } else {
      throw new ValidationError(`Unknown commission type: ${commissionType}`);
    }

    try {
      const commission = await prisma.affiliateCommission.upsert({
        where: {
          holdingId_commissionType_beneficiaryId: {
            holdingId,
            commissionType,
            beneficiaryId,
          },
        },
        update: {},
        create: {
          beneficiaryId,
          brokerId,
          referrerId: commissionType === "referral" ? beneficiaryId : null,
          holdingId,
          commissionType,
          baseAmountUsd,
          ratePercent: rate.ratePercent,
          commissionUsd,
          commissionSak,
          sakPriceAtCalc: sakPrice,
          status: "pending",
        },
      });

      return { created: true, commission: this.formatCommission(commission) };
    } catch (err: any) {
      if (err.code === "P2002") {
        const existing = await prisma.affiliateCommission.findUnique({
          where: {
            holdingId_commissionType_beneficiaryId: {
              holdingId,
              commissionType,
              beneficiaryId,
            },
          },
        });
        return { created: false, commission: existing ? this.formatCommission(existing) : null };
      }
      throw err;
    }
  }

  /**
   * Get applicable commission rate
   */
  async getCommissionRate(
    type: string,
    landId?: string,
    brokerId?: string
  ): Promise<{ ratePercent: Prisma.Decimal } | null> {
    const now = new Date();

    if (landId) {
      const assetRate = await prisma.commissionRate.findFirst({
        where: {
          type,
          landId,
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (assetRate) return { ratePercent: assetRate.ratePercent };
    }

    if (brokerId) {
      const brokerRate = await prisma.commissionRate.findFirst({
        where: {
          type,
          brokerId,
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (brokerRate) return { ratePercent: brokerRate.ratePercent };
    }

    const defaultRate = await prisma.commissionRate.findFirst({
      where: {
        type,
        isDefault: true,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (defaultRate) {
      return { ratePercent: defaultRate.ratePercent };
    }

    return { ratePercent: toDecimal(type === "referral" ? "2.5" : "5.0") };
  }

  /**
   * Approve commissions — only pending commissions may be approved,
   * and every requested id must transition (immutability + idempotency).
   */
  async approveCommissions(commissionIds: string[], approverId: string): Promise<any[]> {
    const uniqueIds = [...new Set(commissionIds)];
    if (uniqueIds.length !== commissionIds.length) {
      throw new ValidationError("Duplicate commission IDs are not allowed");
    }

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundError("Approver not found");
    }

    const before = await prisma.affiliateCommission.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true },
    });
    const notPending = before.filter((c) => c.status !== "pending");
    if (notPending.length > 0) {
      throw new ValidationError(
        `Only pending commissions can be approved: ${notPending.map((c) => c.id).join(", ")}`
      );
    }

    await prisma.affiliateCommission.updateMany({
      where: {
        id: { in: uniqueIds },
        status: "pending",
      },
      data: {
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    const updated = await prisma.affiliateCommission.findMany({
      where: { id: { in: uniqueIds } },
    });

    return updated.map((c) => this.formatCommission(c));
  }

  /**
   * Reject commissions — only pending commissions may be rejected.
   */
  async rejectCommissions(
    commissionIds: string[],
    approverId: string,
    reason: string
  ): Promise<any[]> {
    const uniqueIds = [...new Set(commissionIds)];
    if (uniqueIds.length !== commissionIds.length) {
      throw new ValidationError("Duplicate commission IDs are not allowed");
    }

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundError("Approver not found");
    }

    const before = await prisma.affiliateCommission.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true },
    });
    const notPending = before.filter((c) => c.status !== "pending");
    if (notPending.length > 0) {
      throw new ValidationError(
        `Only pending commissions can be rejected: ${notPending.map((c) => c.id).join(", ")}`
      );
    }

    await prisma.affiliateCommission.updateMany({
      where: {
        id: { in: uniqueIds },
        status: "pending",
      },
      data: {
        status: "rejected",
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    const updated = await prisma.affiliateCommission.findMany({
      where: { id: { in: uniqueIds } },
    });

    return updated.map((c) => this.formatCommission(c));
  }

  /**
   * Get commissions with filtering
   */
  async getCommissions(filters: {
    status?: string;
    type?: string;
    brokerId?: string;
    beneficiaryId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: Prisma.AffiliateCommissionWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.commissionType = filters.type;
    if (filters.brokerId) where.brokerId = filters.brokerId;
    if (filters.beneficiaryId) where.beneficiaryId = filters.beneficiaryId;

    const [total, commissions] = await Promise.all([
      prisma.affiliateCommission.count({ where }),
      prisma.affiliateCommission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          beneficiary: { select: { id: true, email: true, firstName: true } },
          broker: { select: { id: true, displayName: true } },
        },
      }),
    ]);

    return {
      data: commissions.map((c) => ({
        ...this.formatCommission(c),
        beneficiary: c.beneficiary,
        broker: c.broker,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private formatCommission(comm: any) {
    return {
      id: comm.id,
      beneficiaryId: comm.beneficiaryId,
      brokerId: comm.brokerId,
      holdingId: comm.holdingId,
      commissionType: comm.commissionType,
      baseAmountUsd: typeof comm.baseAmountUsd === "object" ? comm.baseAmountUsd.toFixed(2) : comm.baseAmountUsd,
      ratePercent: typeof comm.ratePercent === "object" ? comm.ratePercent.toFixed(4) : comm.ratePercent,
      commissionUsd: typeof comm.commissionUsd === "object" ? comm.commissionUsd.toFixed(2) : comm.commissionUsd,
      commissionSak: typeof comm.commissionSak === "object" ? comm.commissionSak.toFixed(4) : comm.commissionSak,
      sakPriceAtCalc: typeof comm.sakPriceAtCalc === "object" ? comm.sakPriceAtCalc.toFixed(4) : comm.sakPriceAtCalc,
      payoutId: comm.payoutId,
      status: comm.status,
      approvedAt: comm.approvedAt,
      paidAt: comm.paidAt,
      rejectionReason: comm.rejectionReason,
      createdAt: comm.createdAt,
    };
  }
}

export const commissionsService = new CommissionsService();

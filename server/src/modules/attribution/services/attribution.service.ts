import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError, ConflictError } from "../../../lib/errors.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

export class AttributionService {
  /**
   * Correct broker attribution for a holding.
   * - One auditable correction per holding (schema-unique holdingId).
   * - Never silently overwrites: oldBrokerId is recorded and the holding
   *   attribution is updated inside the same transaction.
   * - Pending broker commissions are reconciled to the new broker; approved/paid
   *   commissions are intentionally left untouched (immutable).
   */
  async correctAttribution(input: {
    holdingId: string;
    newBrokerId: string;
    reason: string;
    approvedBy: string;
  }): Promise<any> {
    const { holdingId, newBrokerId, reason, approvedBy } = input;
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError("A reason is required to correct attribution");
    }

    const result = await prisma.$transaction(async (tx) => {
      const holding = await tx.holding.findUnique({
        where: { id: holdingId },
        select: { id: true, brokerId: true },
      });
      if (!holding) throw new NotFoundError("Holding not found");

      const existingCorrection = await tx.attributionCorrection.findUnique({
        where: { holdingId },
      });
      if (existingCorrection) {
        throw new ConflictError("Attribution for this holding has already been corrected");
      }

      const newBroker = await tx.brokerProfile.findUnique({
        where: { id: newBrokerId },
        select: { id: true, userId: true },
      });
      if (!newBroker) throw new NotFoundError("Target broker not found");

      if (holding.brokerId === newBrokerId) {
        throw new ValidationError("New broker is the same as the current attribution");
      }

      const correction = await tx.attributionCorrection.create({
        data: {
          holdingId,
          oldBrokerId: holding.brokerId,
          newBrokerId,
          reason,
          approvedBy,
        },
      });

      await tx.holding.update({
        where: { id: holdingId },
        data: { brokerId: newBrokerId },
      });

      // Reconcile pending broker commissions for this holding if any.
      const reconcile = await tx.affiliateCommission.updateMany({
        where: {
          holdingId,
          commissionType: "broker",
          status: "pending",
        },
        data: {
          brokerId: newBrokerId,
          beneficiaryId: newBroker.userId,
        },
      });

      return { correction, reconciledCommissionCount: reconcile.count };
    });

    try {
      await auditService.log({
        actorId: approvedBy,
        actorEmail: approvedBy,
        actorRole: "admin",
        action: AuditActions.ATTRIBUTION_CORRECTED,
        entityType: "holding",
        entityId: holdingId,
        success: true,
      });
    } catch (err) {
      // audit failure must not roll back the correction
    }

    return result;
  }

  async listCorrections(filters: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const [total, data] = await Promise.all([
      prisma.attributionCorrection.count(),
      prisma.attributionCorrection.findMany({
        orderBy: { approvedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          holding: { select: { id: true, userId: true, landId: true } },
          approver: { select: { id: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const attributionService = new AttributionService();

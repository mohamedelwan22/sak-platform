import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../../../common/responses/index.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { commissionsService } from "../services/commissions.service.js";
import { prisma } from "../../../lib/prisma.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const STAFF_ROLES = ["admin", "super_admin"];

export class CommissionsController {
  async getCommissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const { status, type, brokerId, beneficiaryId, page, limit } = req.query;

      // Non-staff can only ever see their own commissions.
      let effectiveBeneficiaryId: string | undefined;
      let effectiveBrokerId: string | undefined;
      if (!isStaff) {
        // Resolve caller's broker profile; beneficiaries see only their own.
        effectiveBeneficiaryId = userId;
        const broker = await prisma.brokerProfile.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (broker) effectiveBrokerId = broker.id;
      } else {
        effectiveBeneficiaryId = beneficiaryId ? String(beneficiaryId) : undefined;
        effectiveBrokerId = brokerId ? String(brokerId) : undefined;
      }

      const result = await commissionsService.getCommissions({
        status: status ? String(status) : undefined,
        type: type ? String(type) : undefined,
        brokerId: effectiveBrokerId,
        beneficiaryId: effectiveBeneficiaryId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Commissions retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve commissions");
    }
  }

  async approveCommissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { commissionIds } = req.body;

      if (!Array.isArray(commissionIds)) {
        sendError(res, "commissionIds must be an array", 400, "VALIDATION_ERROR");
        return;
      }

      const commissions = await commissionsService.approveCommissions(commissionIds, userId);

      await auditService.logFromRequest(req, {
        action: AuditActions.COMMISSION_APPROVED,
        entityType: "commission",
        entityId: commissionIds.join(","),
        success: true,
      });

      sendSuccess(res, { approved: commissions.length, commissions }, "Commissions approved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to approve commissions");
    }
  }

  async rejectCommissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { commissionIds, reason } = req.body;

      if (!Array.isArray(commissionIds) || !reason) {
        sendError(res, "commissionIds and reason are required", 400, "VALIDATION_ERROR");
        return;
      }

      const commissions = await commissionsService.rejectCommissions(commissionIds, userId, reason);

      await auditService.logFromRequest(req, {
        action: AuditActions.COMMISSION_REJECTED,
        entityType: "commission",
        entityId: commissionIds.join(","),
        success: true,
      });

      sendSuccess(res, { rejected: commissions.length, commissions }, "Commissions rejected");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to reject commissions");
    }
  }
}

export const commissionsController = new CommissionsController();
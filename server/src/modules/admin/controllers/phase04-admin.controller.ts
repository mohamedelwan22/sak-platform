import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../../../common/responses/index.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import { brokersService } from "../../brokers/services/brokers.service.js";
import { commissionsService } from "../../commissions/services/commissions.service.js";
import { leadsService } from "../../leads/services/leads.service.js";
import { cmsService } from "../../cms/services/cms.service.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { attributionService } from "../../attribution/services/attribution.service.js";

export class AdminPhase04Controller {
  // ─────── BROKER MANAGEMENT ────────
  async getBrokers(req: Request, res: Response): Promise<void> {
    try {
      const { verificationStatus, isActive, page, limit, statuses, search } = req.query;

      const result = await brokersService.getBrokers({
        verificationStatus: verificationStatus as string | undefined,
        statuses: statuses
          ? String(statuses)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        search: search ? String(search) : undefined,
        isActive: isActive ? isActive === "true" : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Brokers retrieved");
    } catch {
      sendError(res, "Failed to retrieve brokers");
    }
  }

  async verifyBroker(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status, rejectionReason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      if (!["verified", "rejected"].includes(status)) {
        sendError(res, "Status must be verified or rejected", 400, "VALIDATION_ERROR");
        return;
      }

      const broker = await brokersService.verifyBroker(id, status, userId, rejectionReason);

      // Notify the broker applicant of the decision.
      try {
        const profile = await prisma.brokerProfile.findUnique({
          where: { id },
          select: { userId: true, displayName: true },
        });
        if (profile) {
          const { createNotificationIfPreferred } =
            await import("../../notifications/services/notification-preference.service.js");
          await createNotificationIfPreferred(prisma, {
            userId: profile.userId,
            title:
              status === "verified"
                ? "تمت الموافقة على طلب انضمامك كوسيط"
                : "تم تحديث حالة طلب انضمامك",
            message:
              status === "verified"
                ? "أصبح حسابك وسيطاً معتمداً. يمكنك الآن الدخول إلى بوابة الوسيط."
                : rejectionReason
                  ? `تم رفض طلبك: ${String(rejectionReason).slice(0, 300)}`
                  : "لم تتم الموافقة على طلب انضمامك حالياً.",
            type: "system",
          });
        }
      } catch {
        // notification failure must not break the approval
      }

      await auditService.logFromRequest(req, {
        action: status === "verified" ? AuditActions.BROKER_VERIFIED : AuditActions.BROKER_REJECTED,
        entityType: "broker",
        entityId: id,
        success: true,
      });

      sendSuccess(res, broker, `Broker ${status}`);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to verify broker");
    }
  }

  async deactivateBroker(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const broker = await brokersService.updateBrokerProfile(id, { isActive: false });

      await auditService.logFromRequest(req, {
        action: AuditActions.BROKER_DEACTIVATED,
        entityType: "broker",
        entityId: id,
        success: true,
      });

      sendSuccess(res, broker, "Broker deactivated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to deactivate broker");
    }
  }

  async activateBroker(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const broker = await brokersService.updateBrokerProfile(id, { isActive: true });

      await auditService.logFromRequest(req, {
        action: AuditActions.BROKER_ACTIVATED,
        entityType: "broker",
        entityId: id,
        success: true,
      });

      sendSuccess(res, broker, "Broker activated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to activate broker");
    }
  }

  // ─────── CUSTOMER MANAGEMENT ────────
  async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { status, kycStatus, page, limit } = req.query;

      const where: any = { role: { name: "investor" } };
      if (status) where.status = status;
      if (kycStatus === "verified") {
        where.kycSubmissions = { some: { status: "approved" } };
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: (pageNum - 1) * pageLimit,
          take: pageLimit,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            accountNumber: true,
            createdAt: true,
            wallet: { select: { balance: true } },
            kycSubmissions: { where: { status: "approved" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      sendSuccess(
        res,
        {
          data: users,
          pagination: {
            page: pageNum,
            limit: pageLimit,
            total,
            totalPages: Math.ceil(total / pageLimit),
          },
        },
        "Customers retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve customers");
    }
  }

  async updateCustomerStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      if (!["active", "inactive", "suspended"].includes(status)) {
        sendError(res, "Invalid status", 400, "VALIDATION_ERROR");
        return;
      }

      const before = await prisma.user.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!before) {
        sendNotFound(res, "Customer not found");
        return;
      }

      const user = await prisma.user.update({
        where: { id },
        data: { status: status as any },
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.CUSTOMER_STATUS_UPDATED,
        entityType: "user",
        entityId: id,
        success: true,
      });

      sendSuccess(res, user, "Customer status updated");
    } catch {
      sendError(res, "Failed to update customer status");
    }
  }

  // ─────── COMMISSION MANAGEMENT ────────
  async getCommissionsForApproval(req: Request, res: Response): Promise<void> {
    try {
      const result = await commissionsService.getCommissions({
        status: "pending",
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      sendSuccess(res, result, "Pending commissions retrieved");
    } catch {
      sendError(res, "Failed to retrieve commissions");
    }
  }

  async approveCommissions(req: Request, res: Response): Promise<void> {
    try {
      const { commissionIds } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

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
    } catch {
      sendError(res, "Failed to approve commissions");
    }
  }

  async rejectCommissions(req: Request, res: Response): Promise<void> {
    try {
      const { commissionIds, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
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
    } catch {
      sendError(res, "Failed to reject commissions");
    }
  }

  // ─────── LEAD MANAGEMENT ────────
  async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const result = await leadsService.getLeads({
        status: req.query.status as string | undefined,
        brokerId: req.query.brokerId as string | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      sendSuccess(res, result, "Leads retrieved");
    } catch {
      sendError(res, "Failed to retrieve leads");
    }
  }

  async reassignLead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { brokerId, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const lead = await leadsService.assignLead(id, brokerId, userId, reason);

      await auditService.logFromRequest(req, {
        action: AuditActions.LEAD_ASSIGNED,
        entityType: "lead",
        entityId: id,
        success: true,
      });

      sendSuccess(res, lead, "Lead reassigned");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to reassign lead");
    }
  }

  // ─────── ASSET TYPES & CMS ────────
  async getAssetTypes(req: Request, res: Response): Promise<void> {
    try {
      const result = await cmsService.getAssetTypes({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      sendSuccess(res, result, "Asset types retrieved");
    } catch {
      sendError(res, "Failed to retrieve asset types");
    }
  }

  async createAssetType(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const assetType = await cmsService.createAssetType(userId, req.body);

      await auditService.logFromRequest(req, {
        action: AuditActions.ASSET_TYPE_CREATED,
        entityType: "asset_type",
        entityId: assetType.id,
        success: true,
      });

      sendSuccess(res, assetType, "Asset type created", 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to create asset type");
    }
  }

  async getHomepage(_req: Request, res: Response): Promise<void> {
    try {
      const config = await cmsService.getHomepageConfig();
      sendSuccess(res, config, "Homepage config retrieved");
    } catch {
      sendError(res, "Failed to retrieve homepage config");
    }
  }

  async updateHomepage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const config = await cmsService.updateHomepageConfig(userId, req.body);

      await auditService.logFromRequest(req, {
        action: AuditActions.CMS_HOMEPAGE_UPDATED,
        entityType: "homepage",
        entityId: config.id ?? "config",
        success: true,
      });

      sendSuccess(res, config, "Homepage config updated");
    } catch {
      sendError(res, "Failed to update homepage config");
    }
  }

  // ─────── ATTRIBUTION CORRECTION ────────
  async correctAttribution(req: Request, res: Response): Promise<void> {
    try {
      const holdingId = String(req.params.holdingId);
      const { newBrokerId, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      if (!newBrokerId) {
        sendError(res, "newBrokerId is required", 400, "VALIDATION_ERROR");
        return;
      }

      const result = await attributionService.correctAttribution({
        holdingId,
        newBrokerId: String(newBrokerId),
        reason: reason ? String(reason) : "",
        approvedBy: userId,
      });

      sendSuccess(res, result, "Attribution corrected");
    } catch (err: any) {
      if (err?.statusCode === 400) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err?.statusCode === 404) {
        sendNotFound(res, err.message);
        return;
      }
      if (err?.statusCode === 409) {
        sendError(res, err.message, 409, "CONFLICT");
        return;
      }
      sendError(res, "Failed to correct attribution");
    }
  }

  async listAttributionCorrections(req: Request, res: Response): Promise<void> {
    try {
      const result = await attributionService.listCorrections({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });
      sendSuccess(res, result, "Attribution corrections retrieved");
    } catch {
      sendError(res, "Failed to retrieve attribution corrections");
    }
  }
}

export const adminPhase04Controller = new AdminPhase04Controller();

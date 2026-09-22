import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound, sendForbidden } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { viewingsService } from "../services/viewings.service.js";
import { prisma } from "../../../lib/prisma.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const STAFF_ROLES = ["admin", "super_admin"];

async function resolveCallerBrokerId(userId: string): Promise<string | null> {
  const broker = await prisma.brokerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return broker?.id ?? null;
}

export class ViewingsController {
  async createViewing(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { leadId, landId, notes } = req.body;

      if (!leadId || !landId) {
        sendError(res, "Lead ID and Land ID are required", 400, "VALIDATION_ERROR");
        return;
      }

      // Validate the caller is the lead client or the assigned broker or staff.
      const lead = await prisma.lead.findUnique({
        where: { id: String(leadId) },
        select: { id: true, clientId: true, brokerId: true },
      });
      if (!lead) {
        sendNotFound(res, "Lead not found");
        return;
      }
      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);
      if (!isStaff && userId !== lead.clientId && callerBroker !== lead.brokerId) {
        sendForbidden(res, "Not allowed to request a viewing for this lead");
        return;
      }

      const viewing = await viewingsService.createViewingRequest({
        leadId: String(leadId),
        landId: String(landId),
        requestedById: userId,
        brokerId: lead.brokerId ?? undefined,
        notes,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.VIEWING_CREATED,
        entityType: "viewing",
        entityId: viewing.id,
        success: true,
      });

      sendSuccess(res, viewing, "Viewing request created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to create viewing request");
    }
  }

  async getViewings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);

      const { leadId, landId, status, page, limit } = req.query;

      // Non-staff are always scoped to the resources they own.
      let effectiveRequestedById: string | undefined;
      let effectiveBrokerId: string | undefined;
      if (!isStaff) {
        if (callerBroker) {
          effectiveBrokerId = callerBroker;
        } else {
          effectiveRequestedById = userId;
        }
      }

      const result = await viewingsService.getViewings({
        leadId: leadId ? String(leadId) : undefined,
        landId: landId ? String(landId) : undefined,
        status: status ? String(status) : undefined,
        requestedById: effectiveRequestedById,
        brokerId: effectiveBrokerId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Viewings retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve viewings");
    }
  }

  async updateViewingStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { status, scheduledAt, notes } = req.body;

      if (!status) {
        sendError(res, "Status is required", 400, "VALIDATION_ERROR");
        return;
      }

      const viewing = await prisma.viewingRequest.findUnique({
        where: { id },
        select: { id: true, requestedById: true, brokerId: true },
      });
      if (!viewing) {
        sendNotFound(res, "Viewing request not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);
      if (!isStaff && userId !== viewing.requestedById && callerBroker !== viewing.brokerId) {
        sendForbidden(res, "Cannot update this viewing request");
        return;
      }

      const updated = await viewingsService.updateViewingStatus(
        id,
        String(status),
        scheduledAt ? new Date(String(scheduledAt)) : undefined,
        notes ? String(notes) : undefined
      );

      await auditService.logFromRequest(req, {
        action: AuditActions.VIEWING_UPDATED,
        entityType: "viewing",
        entityId: id,
        success: true,
      });

      sendSuccess(res, updated, "Viewing status updated");
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update viewing");
    }
  }
}

export const viewingsController = new ViewingsController();
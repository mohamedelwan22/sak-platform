import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound, sendForbidden } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { leadsService } from "../services/leads.service.js";
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

export class LeadsController {
  async createLead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { landId, source, referralCode, contactName, contactPhone, notes, brokerId, clientEmail } = req.body;

      if (!contactName || !contactPhone) {
        sendError(res, "contactName and contactPhone are required", 400, "VALIDATION_ERROR");
        return;
      }

      // Only a broker may create a lead for another client; a regular investor
      // may only create a lead where the lead client is the investor themselves.
      const callerBroker = await resolveCallerBrokerId(userId);
      let clientId = userId;
      if (brokerId) {
        const targetBroker = await prisma.brokerProfile.findUnique({ where: { id: String(brokerId) } });
        if (!targetBroker || targetBroker.userId !== userId) {
          sendForbidden(res, "Not allowed to create lead for this broker");
          return;
        }
      }

      // A verified broker may attach the lead to a real customer by email.
      if (clientEmail) {
        if (!callerBroker) {
          sendForbidden(res, "Only brokers may create leads for customers");
          return;
        }
        const broker = await prisma.brokerProfile.findUnique({ where: { id: callerBroker } });
        if (!broker || broker.verificationStatus !== "verified") {
          sendForbidden(res, "Verified brokers only");
          return;
        }
        const email = String(clientEmail).trim().toLowerCase();
        const matched = await prisma.user.findUnique({ where: { email } });
        if (!matched) {
          sendError(res, "No account exists for this customer email", 400, "VALIDATION_ERROR");
          return;
        }
        clientId = matched.id;
        // Record the broker-client association (unique join prevents duplicates).
        await prisma.brokerClient.create({
          data: { brokerId: callerBroker, clientId: matched.id },
        }).catch(() => {
          // unique (brokerId, clientId) — already associated
        });
      }

      const lead = await leadsService.createLead(clientId, {
        landId: landId ? String(landId) : undefined,
        source: String(source || "organic"),
        referralCode: referralCode ? String(referralCode) : undefined,
        contactName: String(contactName),
        contactPhone: String(contactPhone),
        notes: notes ? String(notes) : undefined,
      });

      // Assign the lead to the caller broker immediately if they are a broker.
      if (callerBroker) {
        await leadsService.assignLead(lead.id, callerBroker, userId, "Auto-assigned to submitting broker");
      }

      await auditService.logFromRequest(req, {
        action: AuditActions.LEAD_CREATED,
        entityType: "lead",
        entityId: lead.id,
        success: true,
      });

      sendSuccess(res, lead, "Lead created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to create lead");
    }
  }

  async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);

      const { status, source, page, limit } = req.query;
      const brokerId = req.query.brokerId ? String(req.query.brokerId) : undefined;
      const clientId = req.query.clientId ? String(req.query.clientId) : undefined;

      // Non-staff can only list their own leads (as broker) or their own client leads.
      let effectiveBrokerId = brokerId;
      let effectiveClientId = clientId;
      if (!isStaff) {
        if (callerBroker) {
          effectiveBrokerId = callerBroker;
          effectiveClientId = clientId === userId ? clientId : undefined;
        } else {
          effectiveClientId = userId;
          effectiveBrokerId = undefined;
        }
      }

      const result = await leadsService.getLeads({
        brokerId: effectiveBrokerId,
        clientId: effectiveClientId,
        status: status ? String(status) : undefined,
        source: source ? String(source) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Leads retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve leads");
    }
  }

  async getLeadById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      // Owner/broker/staff check before exposing contact details.
      const lead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, clientId: true, brokerId: true },
      });
      if (!lead) {
        sendNotFound(res, "Lead not found");
        return;
      }
      const userId = req.user?.userId;
      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      if (!isStaff && userId !== lead.clientId && !(lead.brokerId && (await resolveCallerBrokerId(userId!)) === lead.brokerId)) {
        sendForbidden(res, "Cannot access this lead");
        return;
      }

      const result = await leadsService.getLeadById(id);
      sendSuccess(res, result, "Lead retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve lead");
    }
  }

  async updateLeadStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status, notes } = req.body;

      if (!status) {
        sendError(res, "Status is required", 400, "VALIDATION_ERROR");
        return;
      }

      const lead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, clientId: true, brokerId: true },
      });
      if (!lead) {
        sendNotFound(res, "Lead not found");
        return;
      }
      const userId = req.user?.userId;
      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      if (!isStaff && userId !== lead.clientId && !(lead.brokerId && (await resolveCallerBrokerId(userId!)) === lead.brokerId)) {
        sendForbidden(res, "Cannot update this lead");
        return;
      }

      const updated = await leadsService.updateLeadStatus(id, status, notes);

      await auditService.logFromRequest(req, {
        action: AuditActions.LEAD_STATUS_CHANGED,
        entityType: "lead",
        entityId: id,
        success: true,
      });

      sendSuccess(res, updated, "Lead status updated");
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update lead");
    }
  }

  async assignLead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { brokerId, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      if (!isStaff) {
        // Brokers may only self-assign leads; other users may not assign at all.
        const callerBroker = await resolveCallerBrokerId(userId);
        if (String(brokerId) !== callerBroker) {
          sendForbidden(res, "Cannot assign lead to another broker");
          return;
        }
      }

      if (!brokerId) {
        sendError(res, "Broker ID is required", 400, "VALIDATION_ERROR");
        return;
      }

      const lead = await leadsService.assignLead(id, brokerId, userId, reason);

      await auditService.logFromRequest(req, {
        action: AuditActions.LEAD_ASSIGNED,
        entityType: "lead",
        entityId: id,
        success: true,
      });

      sendSuccess(res, lead, "Lead assigned");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to assign lead");
    }
  }
}

export const leadsController = new LeadsController();
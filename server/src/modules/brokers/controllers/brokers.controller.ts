import type { Request, Response } from "express";
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
} from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../../lib/errors.js";
import { brokersService } from "../services/brokers.service.js";
import { prisma } from "../../../lib/prisma.js";
import { auditService } from "../../../modules/audit/controllers/audit.controller.js";
import { AuditActions } from "../../../modules/audit/constants/index.js";

const STAFF_ROLES = ["admin", "super_admin"];

function isStaff(role?: string): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

async function assertBrokerAccess(req: Request, brokerId: string): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) throw new ForbiddenError("Authentication required");
  if (isStaff(req.user?.role)) return;
  const broker = await prisma.brokerProfile.findUnique({
    where: { id: brokerId },
    select: { userId: true },
  });
  if (!broker || broker.userId !== userId) {
    throw new ForbiddenError("Cannot access this broker resource");
  }
}

export class BrokersController {
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { displayName, company, licenseNumber, phone, bio } = req.body;

      if (!displayName) {
        sendError(res, "Display name is required", 400, "VALIDATION_ERROR");
        return;
      }

      const broker = await brokersService.createBrokerProfile(userId, {
        displayName,
        company,
        licenseNumber,
        phone,
        bio,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.BROKER_PROFILE_CREATED,
        entityType: "broker",
        entityId: broker.id,
        success: true,
      });

      sendSuccess(res, broker, "Broker profile created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to create broker profile");
    }
  }

  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const broker = await prisma.brokerProfile.findUnique({
        where: { userId },
      });

      if (!broker) {
        sendNotFound(res, "Broker profile not found");
        return;
      }

      const result = await brokersService.getBrokerProfile(broker.id);
      sendSuccess(res, result, "Broker profile retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve broker profile");
    }
  }

  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const broker = await prisma.brokerProfile.findUnique({ where: { userId } });
      if (!broker) {
        sendNotFound(res, "Broker profile not found");
        return;
      }

      const { displayName, company, phone, bio, licenseNumber } = req.body;
      const updated = await brokersService.updateBrokerProfile(broker.id, {
        displayName,
        company,
        phone,
        bio,
        licenseNumber,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.BROKER_PROFILE_UPDATED,
        entityType: "broker",
        entityId: broker.id,
        success: true,
      });

      sendSuccess(res, updated, "Broker profile updated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update broker profile");
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await assertBrokerAccess(req, id);

      const broker = await brokersService.getBrokerProfile(id);
      sendSuccess(res, broker, "Broker profile retrieved");
    } catch (err) {
      if (err instanceof ForbiddenError) {
        sendForbidden(res, err.message);
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve broker profile");
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await assertBrokerAccess(req, id);

      const { displayName, company, phone, bio } = req.body;
      const broker = await brokersService.updateBrokerProfile(id, {
        displayName,
        company,
        phone,
        bio,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.BROKER_PROFILE_UPDATED,
        entityType: "broker",
        entityId: id,
        success: true,
      });

      sendSuccess(res, broker, "Broker profile updated");
    } catch (err) {
      if (err instanceof ForbiddenError) {
        sendForbidden(res, err.message);
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update broker profile");
    }
  }

  async getBrokers(req: Request, res: Response): Promise<void> {
    try {
      const { verificationStatus, isActive, page, limit } = req.query;

      const result = await brokersService.getBrokers({
        verificationStatus: verificationStatus as string | undefined,
        isActive: isActive ? isActive === "true" : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Brokers retrieved");
    } catch {
      sendError(res, "Failed to retrieve brokers");
    }
  }

  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await assertBrokerAccess(req, id);

      const { page, limit } = req.query;
      const clients = await brokersService.getBrokerClients(id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, { data: clients }, "Broker clients retrieved");
    } catch (err) {
      if (err instanceof ForbiddenError) {
        sendForbidden(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve broker clients");
    }
  }
}

export const brokersController = new BrokersController();

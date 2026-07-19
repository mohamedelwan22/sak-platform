import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { AuditService } from "../services/audit.service.js";
import { AuditRepository } from "../repositories/audit.repository.js";

const auditRepository = new AuditRepository();
export const auditService = new AuditService(auditRepository);

export class AuditController {
  async getLogs(req: Request, res: Response): Promise<void> {
    const {
      action,
      entityType,
      actorId,
      entityId,
      success,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const result = await auditService.getLogs({
      action: action as string | undefined,
      entityType: entityType as string | undefined,
      actorId: actorId as string | undefined,
      entityId: entityId as string | undefined,
      success: success !== undefined ? success === "true" : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    sendSuccess(res, result, "Audit logs retrieved");
  }

  async getLogById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const entry = await auditService.getLogById(id as string);

    if (!entry) {
      sendNotFound(res, "Audit log not found");
      return;
    }

    sendSuccess(res, entry, "Audit log retrieved");
  }

  async getLogsByUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { action, entityType, startDate, endDate, page, limit } = req.query;

    const result = await auditService.getLogsByUserId(userId as string, {
      action: action as string | undefined,
      entityType: entityType as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    sendSuccess(res, result, "User audit logs retrieved");
  }

  async getLogsByEntity(req: Request, res: Response): Promise<void> {
    const { entity, entity_id } = req.params;
    const { action, startDate, endDate, page, limit } = req.query;

    const result = await auditService.getLogsByEntity(entity as string, entity_id as string, {
      action: action as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    sendSuccess(res, result, "Entity audit logs retrieved");
  }

  async searchLogs(req: Request, res: Response): Promise<void> {
    const {
      query,
      action,
      actorId,
      entityType,
      entityId,
      success,
      startDate,
      endDate,
      cursor,
      limit,
    } = req.query;

    const result = await auditService.search({
      query: query as string | undefined,
      action: action as string | undefined,
      actorId: actorId as string | undefined,
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      success: success !== undefined ? success === "true" : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      cursor: cursor as string | undefined,
      limit: limit ? Number(limit) : 20,
    });

    sendSuccess(res, result, "Audit search completed");
  }
}

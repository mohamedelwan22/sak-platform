import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { AuditService } from "../services/audit.service.js";
import { AuditRepository } from "../repositories/audit.repository.js";

const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

export class AuditController {
  async getLogs(req: Request, res: Response): Promise<void> {
    const { action, entityType, actorId, startDate, endDate, page, limit } = req.query;

    const result = await auditService.getLogs({
      action: action as string | undefined,
      entityType: entityType as string | undefined,
      actorId: actorId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    sendSuccess(res, result, "Audit logs retrieved");
  }
}

export { auditService };

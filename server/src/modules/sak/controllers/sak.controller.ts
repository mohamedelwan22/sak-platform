import type { Request, Response } from "express";
import type { UpdateSakConfigInput } from "../types/index.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { SakService } from "../services/sak.service.js";
import { SakRepository } from "../repositories/sak.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const sakRepository = new SakRepository();
const sakService = new SakService(sakRepository);

export class SakController {
  async findAll(_req: Request, res: Response): Promise<void> {
    const result = await sakService.findAll();
    sendSuccess(res, result, "SAK configs retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const config = await sakService.findById(id as string);
      sendSuccess(res, config, "SAK config retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "SAK config not found");
        return;
      }
      throw err;
    }
  }

  async findCurrent(_req: Request, res: Response): Promise<void> {
    const config = await sakService.findCurrent();
    sendSuccess(res, config ?? null, "Current SAK config retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const config = await sakService.create({
      ...req.body,
      effectiveFrom: new Date(req.body.effectiveFrom),
    });
    auditService.logFromRequest(req, {
      action: AuditActions.SAK_CONFIG_CREATED,
      entityType: "sak_config",
      entityId: config.id,
      newValues: config as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, config, "SAK config created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await sakService.findById(id as string);
      const body = req.body as Record<string, unknown>;
      const updateData: UpdateSakConfigInput = {
        ...body,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom as string) : undefined,
      };
      const config = await sakService.update(id as string, updateData);
      auditService.logFromRequest(req, {
        action: AuditActions.SAK_CONFIG_UPDATED,
        entityType: "sak_config",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: config as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, config, "SAK config updated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "SAK config not found");
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await sakService.findById(id as string);
      await sakService.delete(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.SAK_CONFIG_DELETED,
        entityType: "sak_config",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "SAK config deleted");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "SAK config not found");
        return;
      }
      if (err instanceof ConflictError) {
        sendNotFound(res, err.message);
        return;
      }
      throw err;
    }
  }
}

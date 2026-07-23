import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { GoldService } from "../services/gold.service.js";
import { GoldRepository } from "../repositories/gold.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const goldRepository = new GoldRepository();
const goldService = new GoldService(goldRepository);

export class GoldController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit, sortBy, sortOrder } = req.query;
    const result = await goldService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
    });
    sendSuccess(res, result, "Gold prices retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const price = await goldService.findById(id as string);
      sendSuccess(res, price, "Gold price retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Gold price not found");
        return;
      }
      throw err;
    }
  }

  async findLatest(_req: Request, res: Response): Promise<void> {
    const price = await goldService.findLatest();
    sendSuccess(res, price ?? null, "Latest gold price retrieved");
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    const { period } = req.query;
    const stats = await goldService.getStatistics(
      (period as "daily" | "weekly" | "monthly") ?? "daily",
    );
    sendSuccess(res, stats, "Gold price statistics retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const price = await goldService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.GOLD_PRICE_CREATED,
      entityType: "gold_price",
      entityId: price.id,
      newValues: price as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, price, "Gold price created", HttpStatus.CREATED);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await goldService.findById(id as string);
      await goldService.delete(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.GOLD_PRICE_DELETED,
        entityType: "gold_price",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "Gold price deleted");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Gold price not found");
        return;
      }
      throw err;
    }
  }
}

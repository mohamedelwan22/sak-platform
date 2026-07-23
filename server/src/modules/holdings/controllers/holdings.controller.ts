import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import { HoldingService } from "../services/holdings.service.js";
import { HoldingRepository } from "../repositories/holdings.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const holdingRepository = new HoldingRepository();
const holdingService = new HoldingService(holdingRepository);

export class HoldingController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { userId, landId, status, sortBy, sortOrder, page, limit } = req.query;

    const user = req.user as { userId: string; role?: string } | undefined;
    const effectiveUserId =
      user?.role === "investor" ? user.userId : (userId as string | undefined);

    const result = await holdingService.findAll({
      userId: effectiveUserId,
      landId: landId as string | undefined,
      status: status as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Holdings retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const holding = await holdingService.findById(id as string);
      sendSuccess(res, holding, "Holding retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Holding not found");
        return;
      }
      throw err;
    }
  }

  async findByUserId(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const holdings = await holdingService.findByUserId(user.userId);
    sendSuccess(res, holdings, "User holdings retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string } | undefined;
    const { landId, sakOwned } = req.body;

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      sendNotFound(res, "Land not found");
      return;
    }

    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + (land.maturityMonths ?? 12));

    const holding = await holdingService.create({
      userId: user!.userId,
      landId,
      sakOwned,
      purchasePricePerSakUsd: 0,
      maturityDate,
    });

    auditService.logFromRequest(req, {
      action: AuditActions.HOLDING_CREATED,
      entityType: "holding",
      entityId: holding.id,
      newValues: holding as unknown as Record<string, unknown>,
      success: true,
    });

    sendSuccess(res, holding, "Holding created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await holdingService.findById(id as string);
      const holding = await holdingService.update(id as string, req.body);
      auditService.logFromRequest(req, {
        action: AuditActions.HOLDING_UPDATED,
        entityType: "holding",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: holding as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, holding, "Holding updated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Holding not found");
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await holdingService.findById(id as string);
      await holdingService.delete(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.HOLDING_DELETED,
        entityType: "holding",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "Holding deleted");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Holding not found");
        return;
      }
      throw err;
    }
  }

  async getPortfolioSummary(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      sendNotFound(res, "User not found");
      return;
    }
    const summary = await holdingService.getPortfolioSummary(user.userId);
    sendSuccess(res, summary, "Portfolio summary retrieved");
  }
}

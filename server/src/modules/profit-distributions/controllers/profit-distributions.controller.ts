import type { Request, Response } from "express";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { NotFoundError } from "../../../lib/errors.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { ProfitDistributionService } from "../services/profit-distributions.service.js";
import { ProfitDistributionRepository } from "../repositories/profit-distributions.repository.js";

const profitDistributionRepository = new ProfitDistributionRepository();
const profitDistributionService = new ProfitDistributionService(profitDistributionRepository);

export class ProfitDistributionController {
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder, landId } = req.query;
      const p = page ? parseInt(page as string, 10) : 1;
      const l = limit ? parseInt(limit as string, 10) : 20;

      const result = await profitDistributionService.findAll({
        landId: landId as string | undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as "asc" | "desc" | undefined,
        page: p,
        limit: l,
      });

      sendSuccess(
        res,
        {
          data: result.data,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPreviousPage: result.hasPreviousPage,
          },
        },
        "Profit distributions retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve profit distributions");
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const distribution = await profitDistributionService.findById(id);
      sendSuccess(res, distribution, "Profit distribution retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Profit distribution not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
      const { landId, totalProfitUsd, periodStart, periodEnd, payouts } = req.body;

      const distribution = await profitDistributionService.create({
        landId,
        totalProfitUsd,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        distributedBy: user.userId,
        payouts,
      });

      sendSuccess(res, distribution, "Profit distribution created", 201);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Land not found");
        return;
      }
      throw err;
    }
  }

  async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const { landId, totalProfitUsd } = req.query;
      if (!landId || !totalProfitUsd) {
        sendError(res, "landId and totalProfitUsd are required", 400, "VALIDATION_ERROR");
        return;
      }

      const preview = await profitDistributionService.getPreview(
        landId as string,
        parseFloat(totalProfitUsd as string),
      );

      sendSuccess(res, preview, "Profit distribution preview generated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Land not found");
        return;
      }
      throw err;
    }
  }

  async count(_req: Request, res: Response): Promise<void> {
    try {
      const total = await profitDistributionService.count();
      sendSuccess(res, { total }, "Profit distribution count retrieved");
    } catch {
      sendError(res, "Failed to retrieve profit distribution count");
    }
  }

  async findPayouts(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder, distributionId, userId, status } = req.query;
      const p = page ? parseInt(page as string, 10) : 1;
      const l = limit ? parseInt(limit as string, 10) : 20;

      const result = await profitDistributionService.findPayouts({
        distributionId: distributionId as string | undefined,
        userId: userId as string | undefined,
        status: status as string | undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as "asc" | "desc" | undefined,
        page: p,
        limit: l,
      });

      sendSuccess(
        res,
        {
          data: result.data,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPreviousPage: result.hasPreviousPage,
          },
        },
        "Profit payouts retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve profit payouts");
    }
  }

  async findPayoutsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
      const payouts = await profitDistributionService.findPayoutsByUserId(user.userId);
      sendSuccess(res, payouts, "User profit payouts retrieved");
    } catch {
      sendError(res, "Failed to retrieve user profit payouts");
    }
  }
}

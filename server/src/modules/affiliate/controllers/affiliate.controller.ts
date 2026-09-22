import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { ValidationError, NotFoundError } from "../../../lib/errors.js";
import { affiliateService } from "../services/affiliate.service.js";

export class AffiliateController {
  async getReferralLink(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const result = await affiliateService.getReferralLink(userId);
      sendSuccess(res, result, "Referral link retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve referral link");
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const stats = await affiliateService.getReferralStats(userId);
      sendSuccess(res, stats, "Referral statistics retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve referral statistics");
    }
  }

  async getCommissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { status, page, limit } = req.query;
      const result = await affiliateService.getCommissions(userId, {
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Commission history retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve commission history");
    }
  }

  async requestWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { commissionIds } = req.body;

      if (!Array.isArray(commissionIds)) {
        sendError(res, "commissionIds must be an array", 400, "VALIDATION_ERROR");
        return;
      }

      const result = await affiliateService.requestWithdrawal(userId, commissionIds);
      sendSuccess(res, result, "Commission withdrawal processed", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to process withdrawal");
    }
  }
}

export const affiliateController = new AffiliateController();

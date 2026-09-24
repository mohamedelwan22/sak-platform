import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { AppError } from "../../../lib/errors.js";
import { goldPriceService } from "../../../services/gold-price.service.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

export class MarketController {
  /** GET /market/gold/current */
  async getGoldCurrent(_req: Request, res: Response): Promise<void> {
    try {
      const quote = await goldPriceService.getCurrentGoldPrice();
      sendSuccess(res, quote, "Current gold price retrieved");
    } catch (err) {
      this.sendMarketError(res, err, "Failed to retrieve current gold price");
    }
  }

  /** GET /market/gold/history */
  async getGoldHistory(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, page, limit, sortOrder } = req.query as Record<string, string | undefined>;
      const result = await goldPriceService.getGoldPriceHistory({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortOrder: sortOrder === "asc" ? "asc" : "desc",
      });
      sendSuccess(res, result, "Gold price history retrieved");
    } catch (err) {
      this.sendMarketError(res, err, "Failed to retrieve gold price history");
    }
  }

  /** GET /market/sak-price */
  async getSakPrice(_req: Request, res: Response): Promise<void> {
    try {
      const quote = await goldPriceService.getCurrentSAKPrice();
      sendSuccess(res, quote, "Current SAK price retrieved");
    } catch (err) {
      this.sendMarketError(res, err, "Failed to retrieve SAK price");
    }
  }

  /** GET /market/admin/status */
  async getAdminStatus(_req: Request, res: Response): Promise<void> {
    try {
      const [quote, status] = await Promise.all([
        goldPriceService.getCurrentGoldPrice(),
        Promise.resolve(goldPriceService.getProviderStatus()),
      ]);
      sendSuccess(res, { price: quote, provider: status }, "Gold market status retrieved");
    } catch (err) {
      // Status is still useful when no price exists at all.
      if (err instanceof AppError && err.code === "GOLD_PRICE_UNAVAILABLE") {
        sendSuccess(
          res,
          { price: null, provider: goldPriceService.getProviderStatus() },
          "Gold market status retrieved",
        );
        return;
      }
      this.sendMarketError(res, err, "Failed to retrieve gold market status");
    }
  }

  /** POST /market/admin/refresh */
  async adminRefresh(req: Request, res: Response): Promise<void> {
    try {
      const quote = await goldPriceService.refreshGoldPrice();
      await auditService.logFromRequest(req, {
        action: AuditActions.GOLD_PROVIDER_REFRESHED,
        entityType: "gold_price",
        entityId: quote.goldPriceHistoryId,
        newValues: quote as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, quote, "Gold price refreshed");
    } catch (err) {
      if (err instanceof AppError) {
        await auditService.logFromRequest(req, {
          action: AuditActions.GOLD_REFRESH_FAILED,
          entityType: "gold_price",
          errorMessage: err.message,
          success: false,
        });
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, "Failed to refresh gold price");
    }
  }

  /** POST /market/admin/override — manual price override (audited, reason required) */
  async adminOverride(req: Request, res: Response): Promise<void> {
    try {
      const { pricePerOunce, reason, sourceUpdatedAt } = req.body as {
        pricePerOunce: number;
        reason: string;
        sourceUpdatedAt?: string;
      };

      const previous = await goldPriceService.getCurrentGoldPrice().catch(() => null);

      const result = await goldPriceService.recordManualOverride({
        pricePerOunce,
        sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : null,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.GOLD_MANUAL_OVERRIDE,
        entityType: "gold_price",
        entityId: result.goldPriceHistoryId,
        oldValues: (previous ?? null) as unknown as Record<string, unknown>,
        newValues: result.quote as unknown as Record<string, unknown>,
        details: { reason, pricePerOunce },
        success: true,
      });

      sendSuccess(res, result.quote, "Manual price override applied", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, "Failed to apply manual price override");
    }
  }

  private sendMarketError(res: Response, err: unknown, fallback: string): void {
    if (err instanceof AppError) {
      sendError(res, err.message, err.statusCode, err.code);
      return;
    }
    sendError(res, fallback);
  }
}

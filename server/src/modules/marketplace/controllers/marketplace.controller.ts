import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { AppError, ValidationError, NotFoundError } from "../../../lib/errors.js";
import { MarketplaceService } from "../services/marketplace.service.js";

const marketplaceService = new MarketplaceService();

export class MarketplaceController {
  async getCatalog(_req: Request, res: Response): Promise<void> {
    try {
      const catalog = await marketplaceService.getCatalog();
      sendSuccess(res, catalog, "Marketplace catalog retrieved");
    } catch {
      sendError(res, "Failed to retrieve marketplace catalog");
    }
  }

  async getMyOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { status, page, limit } = req.query;
      const result = await marketplaceService.getMyOrders(userId as string, {
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result, "Orders retrieved");
    } catch {
      sendError(res, "Failed to retrieve orders");
    }
  }

  async buy(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const result = await marketplaceService.buySak(userId as string, {
        landId: req.body?.landId,
        sakAmount: req.body?.sakAmount,
      });
      sendSuccess(res, result, "SAK purchased successfully", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendError(res, err.message, 404, "NOT_FOUND");
        return;
      }
      if (err instanceof AppError && (err.statusCode === 400 || err.statusCode === 404)) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      if (err instanceof AppError && err.statusCode === 503) {
        sendError(res, err.message, 503, err.code);
        return;
      }
      sendError(res, "Failed to purchase SAK");
    }
  }

  async sell(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const result = await marketplaceService.sellSak(userId as string, {
        sakAmount: req.body?.sakAmount,
        method: req.body?.method,
        holdingId: req.body?.holdingId,
      });

      const order = result.order as {
        id: string;
        status: string;
        sakQuantity: unknown;
        unitPriceUsd: unknown;
        subtotalUsd: unknown;
        feeSak: unknown;
        feeUsd: unknown;
        totalUsd: unknown;
        createdAt: Date;
      };

      sendSuccess(
        res,
        {
          order: {
            id: order.id,
            type: "sell",
            status: order.status,
            sak_quantity: order.sakQuantity,
            unit_price_usd: order.unitPriceUsd,
            subtotal_usd: order.subtotalUsd,
            fee_sak: order.feeSak,
            fee_usd: order.feeUsd,
            total_usd: order.totalUsd,
            created_at: order.createdAt.toISOString(),
          },
          payment_request: {
            id: result.paymentRequest.id,
            type: result.paymentRequest.type,
            usd_amount: result.paymentRequest.amount,
            currency: result.paymentRequest.currency,
            sak_amount: result.paymentRequest.sakAmount,
            rate_used_at_request: result.paymentRequest.rateUsedAtRequest,
            status: result.paymentRequest.status,
            created_at: result.paymentRequest.createdAt.toISOString(),
          },
        },
        "Sell order created",
        HttpStatus.CREATED,
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof AppError && (err.statusCode === 400 || err.statusCode === 404)) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      if (err instanceof AppError && err.statusCode === 503) {
        sendError(res, err.message, 503, err.code);
        return;
      }
      sendError(res, "Failed to create sell order");
    }
  }

  async convert(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const direction = req.body?.direction;
      if (direction !== "buy" && direction !== "sell") {
        sendError(res, "Invalid direction — must be buy or sell", 400, "VALIDATION_ERROR");
        return;
      }
      const result = await marketplaceService.convert(userId as string, {
        direction,
        landId: req.body?.landId,
        sakAmount: req.body?.sakAmount,
        method: req.body?.method,
        holdingId: req.body?.holdingId,
      });
      sendSuccess(res, result, "Conversion created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendError(res, err.message, 404, "NOT_FOUND");
        return;
      }
      if (err instanceof AppError && (err.statusCode === 400 || err.statusCode === 404)) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      if (err instanceof AppError && err.statusCode === 503) {
        sendError(res, err.message, 503, err.code);
        return;
      }
      sendError(res, "Failed to create conversion");
    }
  }

  findAll(req: Request, res: Response): Promise<void> {
    return this.getCatalog(req, res);
  }

  findById(req: Request, res: Response): Promise<void> {
    return this.getMyOrders(req, res);
  }

  create(req: Request, res: Response): Promise<void> {
    return this.buy(req, res);
  }

  update(_req: Request, res: Response): Promise<void> {
    sendError(res, "Update not supported for marketplace", 405, "METHOD_NOT_ALLOWED");
    return Promise.resolve();
  }

  delete(_req: Request, res: Response): Promise<void> {
    sendError(res, "Delete not supported for marketplace", 405, "METHOD_NOT_ALLOWED");
    return Promise.resolve();
  }
}

import type { Request, Response } from "express";
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
} from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError, ConflictError, AppError } from "../../../lib/errors.js";
import { investmentRequestsService } from "../services/investment-requests.service.js";
import { prisma } from "../../../lib/prisma.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";

const storageService = new LocalStorageService();

const STAFF_ROLES = ["admin", "super_admin"];

function roleOf(req: Request): "admin" | "broker" | "client" {
  const userRole = req.user?.role;
  if (userRole && STAFF_ROLES.includes(userRole)) return "admin";
  return "client";
}

async function isBrokerUser(userId: string): Promise<boolean> {
  const b = await prisma.brokerProfile.findFirst({
    where: { userId, verificationStatus: "verified", isActive: true },
    select: { id: true },
  });
  return !!b;
}

export class InvestmentRequestsController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { landId, amountUsd, brokerId, source } = req.body;
      const r = await investmentRequestsService.create(userId, {
        landId,
        amountUsd,
        brokerId: brokerId ?? null,
        source,
      });
      sendSuccess(res, r, "تم إرسال طلب الاستثمار بنجاح", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ConflictError) {
        sendError(res, err.message, 409, "CONFLICT");
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to create investment request");
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      // Broker users list their assigned requests; staff list all; clients list own.
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";

      const { status, source, page, limit } = req.query;
      const result = await investmentRequestsService.list(actor, userId, {
        status: status ? String(status) : undefined,
        source: source ? String(source) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result, "Investment requests retrieved");
    } catch {
      sendError(res, "Failed to retrieve investment requests");
    }
  }

  async stats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";

      const result = await investmentRequestsService.stats(actor, userId);
      sendSuccess(res, result, "Investment request statistics retrieved");
    } catch {
      sendError(res, "Failed to retrieve investment request statistics");
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";
      const r = await investmentRequestsService.getById(actor, userId, String(req.params.id));
      sendSuccess(res, r, "Investment request retrieved");
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 403) {
        sendForbidden(res, err.message);
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve investment request");
    }
  }

  async transition(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";
      const r = await investmentRequestsService.transition(actor, userId, String(req.params.id), {
        status: req.body?.status,
        note: req.body?.note,
      });
      sendSuccess(res, r, "Investment request updated");
    } catch (err) {
      if (
        err instanceof AppError &&
        (err.statusCode === 403 || err.statusCode === 409 || err.statusCode === 503)
      ) {
        sendError(res, err.message, err.statusCode, err.code ?? "FORBIDDEN");
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update investment request");
    }
  }
  async uploadPaymentProof(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        sendError(res, "Payment proof file is required", 400, "VALIDATION_ERROR");
        return;
      }
      const uploaded = await storageService.upload(file, "payments");
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";
      const r = await investmentRequestsService.uploadPaymentProof(
        actor,
        userId,
        String(req.params.id),
        {
          proofPath: uploaded.path,
          paymentMethod: req.body?.paymentMethod ? String(req.body.paymentMethod) : undefined,
        },
      );
      sendSuccess(res, r, "تم رفع إثبات الدفع بنجاح", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof AppError && (err.statusCode === 403 || err.statusCode === 409)) {
        sendError(res, err.message, err.statusCode, err.code ?? "FORBIDDEN");
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to upload payment proof");
    }
  }

  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";
      const r = await investmentRequestsService.confirmPayment(
        actor,
        userId,
        String(req.params.id),
        req.body?.note ? String(req.body.note) : undefined,
      );
      sendSuccess(res, r, "تم تأكيد الدفع");
    } catch (err) {
      if (err instanceof AppError && (err.statusCode === 403 || err.statusCode === 409)) {
        sendError(res, err.message, err.statusCode, err.code ?? "FORBIDDEN");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to confirm payment");
    }
  }

  async rejectPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const actor: "admin" | "broker" | "client" =
        roleOf(req) === "admin" ? "admin" : (await isBrokerUser(userId)) ? "broker" : "client";
      const r = await investmentRequestsService.rejectPayment(
        actor,
        userId,
        String(req.params.id),
        req.body?.reason ? String(req.body.reason) : undefined,
      );
      sendSuccess(res, r, "تم رفض إثبات الدفع");
    } catch (err) {
      if (err instanceof AppError && (err.statusCode === 403 || err.statusCode === 409)) {
        sendError(res, err.message, err.statusCode, err.code ?? "FORBIDDEN");
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to reject payment");
    }
  }
}

export const investmentRequestsController = new InvestmentRequestsController();

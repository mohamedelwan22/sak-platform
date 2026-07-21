import type { Request, Response } from "express";
import { sendSuccess, sendNotFound, sendConflict } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { PaymentService } from "../services/payments.service.js";
import { PaymentRepository } from "../repositories/payments.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";
import type { CreatePaymentInput } from "../types/index.js";

const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository);
const storageService = new LocalStorageService();

export class PaymentController {
  async findAll(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const { type, status, search, sortBy, sortOrder, page, limit } = req.query;

    const filters: Record<string, unknown> = {
      type: type as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    if (user.role === "investor") {
      filters.userId = user.userId;
    }

    const result = await paymentService.findAll(
      filters as Parameters<typeof paymentService.findAll>[0],
    );
    sendSuccess(res, result, "Payment requests retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const payment = await paymentService.findById(id as string);
      sendSuccess(res, payment, "Payment request retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Payment request not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const files = req.files as Express.Multer.File[] | undefined;

    const input: CreatePaymentInput = {
      userId: user.userId,
      type: req.body.type as string,
      amount: req.body.amount as string,
      currency: (req.body.currency as string) ?? "USD",
    };

    if (files && files.length > 0) {
      const uploaded = await storageService.upload(files[0], "payments");
      input.proofPath = uploaded.path;
    }

    const payment = await paymentService.create(input);
    auditService.logFromRequest(req, {
      action: AuditActions.PAYMENT_CREATED,
      entityType: "payment_request",
      entityId: payment.id,
      newValues: payment as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, payment, "Payment request created", HttpStatus.CREATED);
  }

  async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    try {
      const before = await paymentService.findById(id as string);
      const payment = await paymentService.approve(id as string, user.userId);
      auditService.logFromRequest(req, {
        action: AuditActions.PAYMENT_APPROVED,
        entityType: "payment_request",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: payment as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, payment, "Payment request approved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Payment request not found");
        return;
      }
      if (err instanceof ConflictError) {
        sendConflict(res, "Payment request already approved");
        return;
      }
      throw err;
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    try {
      const before = await paymentService.findById(id as string);
      const payment = await paymentService.reject(id as string, {
        status: "rejected",
        adminNotes: req.body.adminNotes as string | undefined,
        reviewedBy: user.userId,
      });
      auditService.logFromRequest(req, {
        action: AuditActions.PAYMENT_REJECTED,
        entityType: "payment_request",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: payment as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, payment, "Payment request rejected");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Payment request not found");
        return;
      }
      if (err instanceof ConflictError) {
        sendConflict(res, "Payment request already rejected");
        return;
      }
      throw err;
    }
  }
}

import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { TransactionService } from "../services/transactions.service.js";
import { TransactionRepository } from "../repositories/transactions.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";

const transactionRepository = new TransactionRepository();
const transactionService = new TransactionService(transactionRepository);

export class TransactionController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { walletId, type, status, search, sortBy, sortOrder, page, limit } = req.query;
    const result = await transactionService.findAll({
      walletId: walletId as string | undefined,
      type: type as
        "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "adjustment" | undefined,
      status: status as "pending" | "approved" | "rejected" | "completed" | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Transactions retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const transaction = await transactionService.findById(id as string);
      sendSuccess(res, transaction, "Transaction retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Transaction not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const transaction = await transactionService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.TRANSACTION_CREATED,
      entityType: "transaction",
      entityId: transaction.id,
      newValues: transaction as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, transaction, "Transaction created", HttpStatus.CREATED);
  }

  async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    try {
      const before = await transactionService.findById(id as string);
      const transaction = await transactionService.approve(id as string, user.userId);
      auditService.logFromRequest(req, {
        action: AuditActions.TRANSACTION_APPROVED,
        entityType: "transaction",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: transaction as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, transaction, "Transaction approved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Transaction not found");
        return;
      }
      throw err;
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await transactionService.findById(id as string);
      const transaction = await transactionService.reject(id as string, req.body);
      auditService.logFromRequest(req, {
        action: AuditActions.TRANSACTION_REJECTED,
        entityType: "transaction",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: transaction as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, transaction, "Transaction rejected");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Transaction not found");
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await transactionService.findById(id as string);
      await transactionService.delete(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.TRANSACTION_DELETED,
        entityType: "transaction",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "Transaction deleted");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Transaction not found");
        return;
      }
      throw err;
    }
  }
}

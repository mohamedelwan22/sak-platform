import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { WalletService } from "../services/wallets.service.js";
import { WalletRepository } from "../repositories/wallets.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const walletRepository = new WalletRepository();
const walletService = new WalletService(walletRepository);

export class WalletController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { search, status, sortBy, sortOrder, page, limit } = req.query;
    const result = await walletService.findAll({
      search: search as string | undefined,
      status: status as "active" | "frozen" | "closed" | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Wallets retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const wallet = await walletService.findById(id as string);
      sendSuccess(res, wallet, "Wallet retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Wallet not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const wallet = await walletService.create(req.body);
      auditService.logFromRequest(req, {
        action: AuditActions.WALLET_CREATED,
        entityType: "wallet",
        entityId: wallet.id,
        newValues: wallet as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, wallet, "Wallet created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "User not found");
        return;
      }
      throw err;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await walletService.findById(id as string);
      const wallet = await walletService.update(id as string, req.body);
      auditService.logFromRequest(req, {
        action: AuditActions.WALLET_UPDATED,
        entityType: "wallet",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: wallet as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, wallet, "Wallet updated");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Wallet not found");
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await walletService.findById(id as string);
      await walletService.close(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.WALLET_DELETED,
        entityType: "wallet",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "Wallet closed");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Wallet not found");
        return;
      }
      throw err;
    }
  }

  async restore(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const before = await walletService.findById(id as string);
      await walletService.restore(id as string);
      const restored = await walletService.findById(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.WALLET_RESTORED,
        entityType: "wallet",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: restored as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, restored, "Wallet restored");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Wallet not found");
        return;
      }
      throw err;
    }
  }
}

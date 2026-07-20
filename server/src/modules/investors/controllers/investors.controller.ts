import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { InvestorService } from "../services/investors.service.js";
import { InvestorRepository } from "../repositories/investors.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const investorRepository = new InvestorRepository();
const investorService = new InvestorService(investorRepository);

export class InvestorController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { search, status, sortBy, sortOrder, page, limit } = req.query;
    const result = await investorService.findAll({
      search: search as string | undefined,
      status: status as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Investors retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const investor = await investorService.findById(id as string);
      sendSuccess(res, investor, "Investor retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Investor not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const investor = await investorService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.INVESTOR_CREATED,
      entityType: "investor",
      entityId: investor.id,
      newValues: investor as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, investor, "Investor created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await investorService.findById(id as string);
    const investor = await investorService.update(id as string, req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.INVESTOR_UPDATED,
      entityType: "investor",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: investor as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, investor, "Investor updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await investorService.findById(id as string);
    await investorService.softDelete(id as string);
    auditService.logFromRequest(req, {
      action: AuditActions.INVESTOR_DELETED,
      entityType: "investor",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, null, "Investor deleted");
  }

  async restore(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await investorService.findById(id as string);
    await investorService.restore(id as string);
    const restored = await investorService.findById(id as string);
    auditService.logFromRequest(req, {
      action: AuditActions.INVESTOR_RESTORED,
      entityType: "investor",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: restored as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, restored, "Investor restored");
  }
}

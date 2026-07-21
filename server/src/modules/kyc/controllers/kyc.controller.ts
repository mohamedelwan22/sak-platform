import type { Request, Response } from "express";
import { sendSuccess, sendNotFound, sendConflict } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { KycService } from "../services/kyc.service.js";
import { KycRepository } from "../repositories/kyc.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";
import type { CreateKycInput } from "../types/index.js";

const kycRepository = new KycRepository();
const kycService = new KycService(kycRepository);
const storageService = new LocalStorageService();

export class KycController {
  async findAll(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const { status, documentType, search, sortBy, sortOrder, page, limit } = req.query;

    const filters: Record<string, unknown> = {
      status: status as string | undefined,
      documentType: documentType as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    if (user.role === "investor") {
      filters.userId = user.userId;
    }

    const result = await kycService.findAll(filters as Parameters<typeof kycService.findAll>[0]);
    sendSuccess(res, result, "KYC submissions retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const submission = await kycService.findById(id as string);
      sendSuccess(res, submission, "KYC submission retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "KYC submission not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const input: CreateKycInput = {
      userId: user.userId,
      documentType: req.body.documentType as string,
    };

    if (files) {
      if (files.front && files.front.length > 0) {
        const uploaded = await storageService.upload(files.front[0], "kyc");
        input.frontImagePath = uploaded.path;
      }
      if (files.back && files.back.length > 0) {
        const uploaded = await storageService.upload(files.back[0], "kyc");
        input.backImagePath = uploaded.path;
      }
      if (files.selfie && files.selfie.length > 0) {
        const uploaded = await storageService.upload(files.selfie[0], "kyc");
        input.selfieImagePath = uploaded.path;
      }
    }

    const submission = await kycService.create(input);
    auditService.logFromRequest(req, {
      action: AuditActions.KYC_SUBMITTED,
      entityType: "kyc_submission",
      entityId: submission.id,
      newValues: submission as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, submission, "KYC submission created", HttpStatus.CREATED);
  }

  async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    try {
      const before = await kycService.findById(id as string);
      const submission = await kycService.approve(id as string, user.userId);
      auditService.logFromRequest(req, {
        action: AuditActions.KYC_APPROVED,
        entityType: "kyc_submission",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: submission as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, submission, "KYC submission approved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "KYC submission not found");
        return;
      }
      if (err instanceof ConflictError) {
        sendConflict(res, "KYC submission already approved");
        return;
      }
      throw err;
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    try {
      const before = await kycService.findById(id as string);
      const submission = await kycService.reject(id as string, {
        status: "rejected",
        adminNotes: req.body.adminNotes as string | undefined,
        reviewedBy: user.userId,
      });
      auditService.logFromRequest(req, {
        action: AuditActions.KYC_REJECTED,
        entityType: "kyc_submission",
        entityId: id as string,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: submission as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, submission, "KYC submission rejected");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "KYC submission not found");
        return;
      }
      if (err instanceof ConflictError) {
        sendConflict(res, "KYC submission already rejected");
        return;
      }
      throw err;
    }
  }
}

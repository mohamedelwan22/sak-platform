import type { Request, Response } from "express";
import {
  sendSuccess,
  sendNotFound,
  sendError,
  sendConflict,
} from "../../../common/responses/index.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { CertificateService } from "../services/certificates.service.js";
import { CertificateRepository } from "../repositories/certificates.repository.js";
import { prisma } from "../../../lib/prisma.js";

const certificateRepository = new CertificateRepository();
const certificateService = new CertificateService(certificateRepository);

export class CertificateController {
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
      const { page, limit, sortBy, sortOrder } = req.query;
      const p = page ? parseInt(page as string, 10) : 1;
      const l = limit ? parseInt(limit as string, 10) : 20;

      const result = await certificateService.findAll({
        userId: user.userId,
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
        "Certificates retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve certificates");
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const certificate = await certificateService.findById(id);
      sendSuccess(res, certificate, "Certificate retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Certificate not found");
        return;
      }
      throw err;
    }
  }

  async generate(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
      const { holdingId } = req.body;

      const holding = await prisma.holding.findFirst({
        where: { id: holdingId, userId: user.userId },
        include: {
          land: {
            select: {
              titleEn: true,
              titleAr: true,
              country: true,
              city: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!holding) {
        sendNotFound(res, "Holding not found");
        return;
      }

      const certificate = await certificateService.generate(
        user.userId,
        holdingId,
        { firstName: holding.user.firstName, lastName: holding.user.lastName },
        {
          sakOwned: Number(holding.sakOwned),
          purchasePricePerSakUsd: Number(holding.purchasePricePerSakUsd),
          purchaseDate: holding.purchaseDate,
          land: holding.land,
        },
      );

      sendSuccess(res, certificate, "Certificate generated", 201);
    } catch (err) {
      if (err instanceof ConflictError) {
        sendConflict(res, "Certificate already exists for this holding");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Holding not found");
        return;
      }
      throw err;
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const certificate = await certificateService.findById(id);
      const filePath = certificateService.getFilePath(certificate.filePath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="certificate-${certificate.id}.pdf"`,
      );

      const fs = await import("node:fs/promises");
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Certificate not found");
        return;
      }
      sendError(res, "Failed to download certificate");
    }
  }

  async count(_req: Request, res: Response): Promise<void> {
    try {
      const total = await certificateService.count();
      sendSuccess(res, { total }, "Certificate count retrieved");
    } catch {
      sendError(res, "Failed to retrieve certificate count");
    }
  }
}

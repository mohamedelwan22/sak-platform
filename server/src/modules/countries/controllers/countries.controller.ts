import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { CountryService } from "../services/countries.service.js";
import { CountryRepository } from "../repositories/countries.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const countryRepository = new CountryRepository();
const countryService = new CountryService(countryRepository);

export class CountryController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { search, status, sortBy, sortOrder, page, limit } = req.query;
    const result = await countryService.findAll({
      search: search as string | undefined,
      status: status as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Countries retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const country = await countryService.findById(id as string);
      sendSuccess(res, country, "Country retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Country not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const country = await countryService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.COUNTRY_CREATED,
      entityType: "country",
      entityId: country.id,
      newValues: country as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, country, "Country created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await countryService.findById(id as string);
    const country = await countryService.update(id as string, req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.COUNTRY_UPDATED,
      entityType: "country",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: country as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, country, "Country updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await countryService.findById(id as string);
    await countryService.delete(id as string);
    auditService.logFromRequest(req, {
      action: AuditActions.COUNTRY_DELETED,
      entityType: "country",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, null, "Country deleted");
  }
}

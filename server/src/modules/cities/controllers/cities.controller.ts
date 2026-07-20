import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { CityService } from "../services/cities.service.js";
import { CityRepository } from "../repositories/cities.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const cityRepository = new CityRepository();
const cityService = new CityService(cityRepository);

export class CityController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { countryId, search, isActive, sortBy, sortOrder, page, limit } = req.query;
    const result = await cityService.findAll({
      countryId: countryId as string | undefined,
      search: search as string | undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Cities retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const city = await cityService.findById(id as string);
      sendSuccess(res, city, "City retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "City not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const city = await cityService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.CITY_CREATED,
      entityType: "city",
      entityId: city.id,
      newValues: city as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, city, "City created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await cityService.findById(id as string);
    const city = await cityService.update(id as string, req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.CITY_UPDATED,
      entityType: "city",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: city as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, city, "City updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await cityService.findById(id as string);
    await cityService.delete(id as string);
    auditService.logFromRequest(req, {
      action: AuditActions.CITY_DELETED,
      entityType: "city",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, null, "City deleted");
  }
}

import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { cmsService } from "../services/cms.service.js";

export class CMSController {
  async createAssetType(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { slug, nameEn, nameAr, descriptionEn, descriptionAr, sortOrder } = req.body;

      if (!slug || !nameEn || !nameAr) {
        sendError(res, "slug, nameEn, and nameAr are required", 400, "VALIDATION_ERROR");
        return;
      }

      const assetType = await cmsService.createAssetType(userId, {
        slug,
        nameEn,
        nameAr,
        descriptionEn,
        descriptionAr,
        sortOrder,
      });

      sendSuccess(res, assetType, "Asset type created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to create asset type");
    }
  }

  async addAssetField(req: Request, res: Response): Promise<void> {
    try {
      const typeId = String(req.params.typeId);
      const {
        fieldKey,
        labelEn,
        labelAr,
        fieldType,
        isRequired,
        isSearchable,
        isFilterable,
        isPublic,
        options,
        sortOrder,
      } = req.body;

      if (!fieldKey || !labelEn || !labelAr || !fieldType) {
        sendError(
          res,
          "fieldKey, labelEn, labelAr, and fieldType are required",
          400,
          "VALIDATION_ERROR",
        );
        return;
      }

      const field = await cmsService.addAssetField(typeId, {
        fieldKey,
        labelEn,
        labelAr,
        fieldType,
        isRequired,
        isSearchable,
        isFilterable,
        isPublic,
        options,
        sortOrder,
      });

      sendSuccess(res, field, "Asset field added", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to add asset field");
    }
  }

  async getAssetTypes(req: Request, res: Response): Promise<void> {
    try {
      const { isActive, page, limit } = req.query;

      const result = await cmsService.getAssetTypes({
        isActive: isActive ? isActive === "true" : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Asset types retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve asset types");
    }
  }

  async getAssetType(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const assetType = await cmsService.getAssetType(id);
      sendSuccess(res, assetType, "Asset type retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve asset type");
    }
  }

  async updateHomepage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const config = await cmsService.updateHomepageConfig(userId, req.body);
      sendSuccess(res, config, "Homepage config updated");
    } catch (err) {
      sendError(res, "Failed to update homepage config");
    }
  }

  async getHomepage(_req: Request, res: Response): Promise<void> {
    try {
      const config = await cmsService.getHomepageConfig();
      sendSuccess(res, config, "Homepage config retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve homepage config");
    }
  }

  async setAssetFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const landId = String(req.params.landId);
      const { values } = req.body;
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        sendError(res, "values must be an object", 400, "VALIDATION_ERROR");
        return;
      }

      const result = await cmsService.setAssetFieldValues(
        landId,
        values as Record<string, unknown>,
      );
      sendSuccess(res, result, "Asset field values saved");
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to save asset field values");
    }
  }

  async getAssetFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const landId = String(req.params.landId);
      const result = await cmsService.getAssetFieldValues(landId);
      sendSuccess(res, result, "Asset field values retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to retrieve asset field values");
    }
  }
}

export const cmsController = new CMSController();

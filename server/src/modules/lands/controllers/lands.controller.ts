import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound, sendConflict } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { ValidationError } from "../../../lib/errors.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { assertLandStatusTransition } from "../services/land-status.service.js";

function mapLand(land: Record<string, unknown>) {
  return {
    id: land.id,
    project_id: land.projectId,
    title_ar: land.titleAr,
    title_en: land.titleEn,
    description_ar: land.descriptionAr,
    description_en: land.descriptionEn,
    asset_type: land.assetType,
    country: land.country,
    city: land.city,
    area_m2: land.areaM2,
    total_sak_inventory: land.totalSakInventory,
    available_sak: land.availableSak,
    maturity_months: land.maturityMonths,
    expected_roi: land.expectedRoi,
    risk_level: land.riskLevel,
    cover_image_url: land.coverImageUrl,
    gallery: land.gallery,
    documents: land.documents,
    lat: land.lat,
    lng: land.lng,
    status: land.status,
    use_type: land.useType ?? null,
    cultivation_status: land.cultivationStatus ?? null,
    acquisition_date: land.acquisitionDate ?? null,
    public_details_url: land.publicDetailsUrl ?? null,
    google_maps_url: land.googleMapsUrl ?? null,
    created_at: land.createdAt,
    updated_at: land.updatedAt,
    _count: land._count,
    project: land.project,
  };
}

export class LandController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { search, status, assetType, projectId, page, limit } = req.query;
    const pageNum = page ? Math.max(1, Number(page)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.LandWhereInput = {};
    if (status) where.status = String(status);
    if (assetType) where.assetType = String(assetType);
    if (projectId) where.projectId = String(projectId);
    if (search) {
      const q = String(search);
      where.OR = [
        { titleAr: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }

    const [lands, total] = await Promise.all([
      prisma.land.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          _count: { select: { holdings: true } },
          project: { select: { id: true, titleAr: true, titleEn: true } },
        },
      }),
      prisma.land.count({ where }),
    ]);

    const mapped = lands.map((l) => {
      const obj = l as unknown as Record<string, unknown>;
      const totalInv = Number(obj.totalSakInventory);
      const avail = Number(obj.availableSak);
      const soldSak = totalInv - avail;
      const mapped = mapLand(obj);
      return {
        ...mapped,
        sold_sak: soldSak,
        holding_count: (obj._count as Record<string, unknown>)?.holdings ?? 0,
      };
    });

    sendSuccess(
      res,
      {
        data: mapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      "Lands retrieved",
    );
  }

  async findById(req: Request, res: Response): Promise<void> {
    const land = await prisma.land.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: { select: { holdings: true } },
        project: { select: { id: true, titleAr: true, titleEn: true } },
      },
    });
    if (!land) {
      sendNotFound(res, "Land not found");
      return;
    }
    const obj = land as unknown as Record<string, unknown>;
    const totalInv = Number(obj.totalSakInventory);
    const avail = Number(obj.availableSak);
    const mapped = mapLand(obj);
    sendSuccess(
      res,
      {
        ...mapped,
        sold_sak: totalInv - avail,
        holding_count: (obj._count as Record<string, unknown>)?.holdings ?? 0,
      },
      "Land retrieved",
    );
  }

  async create(req: Request, res: Response): Promise<void> {
    const d = req.body;

    if (d.projectId) {
      const project = await prisma.project.findUnique({ where: { id: String(d.projectId) } });
      if (!project) {
        throw new ValidationError("Invalid projectId: project not found", {
          projectId: "Project does not exist",
        });
      }
    }

    const availableSak = Number(d.availableSak ?? d.totalSakInventory ?? 0);
    const totalSakInventory = Number(d.totalSakInventory ?? availableSak);
    if (availableSak > totalSakInventory) {
      throw new ValidationError("availableSak cannot exceed totalSakInventory");
    }

    const land = await prisma.land.create({
      data: {
        projectId: d.projectId ?? null,
        titleAr: d.titleAr ?? "",
        titleEn: d.titleEn ?? "",
        descriptionAr: d.descriptionAr ?? "",
        descriptionEn: d.descriptionEn ?? "",
        assetType: d.assetType ?? "land",
        country: d.country ?? "",
        city: d.city ?? "",
        areaM2: d.areaM2 ?? 0,
        totalSakInventory,
        availableSak,
        maturityMonths: d.maturityMonths ?? 12,
        expectedRoi: d.expectedRoi ?? 0,
        riskLevel: d.riskLevel ?? "low",
        coverImageUrl: d.coverImageUrl ?? null,
        gallery: d.gallery ?? [],
        documents: d.documents ?? [],
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        status: d.status ?? "draft",
        useType: d.useType ?? null,
        cultivationStatus: d.cultivationStatus ?? null,
        acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
        publicDetailsUrl: d.publicDetailsUrl !== undefined ? d.publicDetailsUrl || null : null,
        googleMapsUrl: d.googleMapsUrl !== undefined ? d.googleMapsUrl || null : null,
      },
    });

    const created: Record<string, unknown> = {
      ...(land as unknown as Record<string, unknown>),
      documents: undefined,
    };
    auditService.logFromRequest(req, {
      action: AuditActions.LAND_CREATED,
      entityType: "land",
      entityId: land.id,
      newValues: created,
      success: true,
    });

    sendSuccess(
      res,
      mapLand(land as unknown as Record<string, unknown>),
      "Land created",
      HttpStatus.CREATED,
    );
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const existing = await prisma.land.findUnique({ where: { id } });
    if (!existing) {
      sendNotFound(res, "Land not found");
      return;
    }
    const d = req.body;

    if (d.projectId) {
      const project = await prisma.project.findUnique({ where: { id: String(d.projectId) } });
      if (!project) {
        throw new ValidationError("Invalid projectId: project not found", {
          projectId: "Project does not exist",
        });
      }
    }

    const existingObj = existing as unknown as Record<string, unknown>;
    const totalInventory =
      d.totalSakInventory !== undefined
        ? Number(d.totalSakInventory)
        : Number(existingObj.totalSakInventory);
    const available =
      d.availableSak !== undefined ? Number(d.availableSak) : Number(existingObj.availableSak);
    if (available > totalInventory) {
      throw new ValidationError("availableSak cannot exceed totalSakInventory");
    }

    let transitionNote: string | undefined;
    if (d.status && d.status !== existing.status) {
      const result = assertLandStatusTransition({
        currentStatus: existing.status,
        requestedStatus: String(d.status),
        availableSak: available,
        totalSakInventory: totalInventory,
      });
      if (result.edgeCase) {
        transitionNote = "BR-019 edge case: sold_out -> active (inventory re-added)";
      }
    }

    const land = await prisma.land.update({
      where: { id },
      data: {
        ...(d.projectId !== undefined && { projectId: d.projectId }),
        ...(d.titleAr !== undefined && { titleAr: d.titleAr }),
        ...(d.titleEn !== undefined && { titleEn: d.titleEn }),
        ...(d.descriptionAr !== undefined && { descriptionAr: d.descriptionAr }),
        ...(d.descriptionEn !== undefined && { descriptionEn: d.descriptionEn }),
        ...(d.assetType !== undefined && { assetType: d.assetType }),
        ...(d.country !== undefined && { country: d.country }),
        ...(d.city !== undefined && { city: d.city }),
        ...(d.areaM2 !== undefined && { areaM2: d.areaM2 }),
        ...(d.totalSakInventory !== undefined && { totalSakInventory: d.totalSakInventory }),
        ...(d.availableSak !== undefined && { availableSak: d.availableSak }),
        ...(d.maturityMonths !== undefined && { maturityMonths: d.maturityMonths }),
        ...(d.expectedRoi !== undefined && { expectedRoi: d.expectedRoi }),
        ...(d.riskLevel !== undefined && { riskLevel: d.riskLevel }),
        ...(d.coverImageUrl !== undefined && { coverImageUrl: d.coverImageUrl }),
        ...(d.gallery !== undefined && { gallery: d.gallery }),
        ...(d.documents !== undefined && { documents: d.documents }),
        ...(d.lat !== undefined && { lat: d.lat }),
        ...(d.lng !== undefined && { lng: d.lng }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.useType !== undefined && { useType: d.useType }),
        ...(d.cultivationStatus !== undefined && { cultivationStatus: d.cultivationStatus }),
        ...(d.acquisitionDate !== undefined && {
          acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
        }),
        ...(d.publicDetailsUrl !== undefined && {
          publicDetailsUrl: d.publicDetailsUrl || null,
        }),
        ...(d.googleMapsUrl !== undefined && {
          googleMapsUrl: d.googleMapsUrl || null,
        }),
      },
    });

    auditService.logFromRequest(req, {
      action: AuditActions.LAND_UPDATED,
      entityType: "land",
      entityId: id,
      oldValues: mapLand(existingObj),
      newValues: mapLand(land as unknown as Record<string, unknown>),
      details: transitionNote ? { note: transitionNote } : undefined,
      success: true,
    });

    sendSuccess(res, mapLand(land as unknown as Record<string, unknown>), "Land updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const existing = await prisma.land.findUnique({ where: { id } });
    if (!existing) {
      sendNotFound(res, "Land not found");
      return;
    }

    const dependents = await prisma.$transaction([
      prisma.holding.count({ where: { landId: id } }),
      prisma.profitDistribution.count({ where: { landId: id } }),
      prisma.order.count({ where: { landId: id } }),
    ]);
    const [holdingCount, distributionCount, orderCount] = dependents;

    if (holdingCount > 0 || distributionCount > 0 || orderCount > 0) {
      sendConflict(
        res,
        "Cannot delete land with existing holdings, profit distributions, or orders. Soft-delete (close) the land instead.",
      );
      return;
    }

    await prisma.land.delete({ where: { id } });

    auditService.logFromRequest(req, {
      action: AuditActions.LAND_DELETED,
      entityType: "land",
      entityId: id,
      oldValues: mapLand(existing as unknown as Record<string, unknown>),
      success: true,
    });

    sendSuccess(res, null, "Land deleted");
  }
}

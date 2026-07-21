import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";

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
    status: land.status,
    created_at: land.createdAt,
    updated_at: land.updatedAt,
  };
}

export class LandController {
  async findAll(_req: Request, res: Response): Promise<void> {
    const lands = await prisma.land.findMany({
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, lands.map(mapLand), "Lands retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const land = await prisma.land.findUnique({ where: { id: String(req.params.id) } });
    if (!land) {
      sendNotFound(res, "Land not found");
      return;
    }
    sendSuccess(res, mapLand(land as unknown as Record<string, unknown>), "Land retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const d = req.body;
    const land = await prisma.land.create({
      data: {
        projectId: d.project_id ?? d.projectId ?? null,
        titleAr: d.title_ar ?? d.titleAr ?? "",
        titleEn: d.title_en ?? d.titleEn ?? "",
        descriptionAr: d.description_ar ?? d.descriptionAr ?? "",
        descriptionEn: d.description_en ?? d.descriptionEn ?? "",
        assetType: d.asset_type ?? d.assetType ?? "land",
        country: d.country ?? "",
        city: d.city ?? "",
        areaM2: d.area_m2 ?? d.areaM2 ?? 0,
        totalSakInventory: d.total_sak_inventory ?? d.totalSakInventory ?? 0,
        availableSak: d.available_sak ?? d.availableSak ?? 0,
        maturityMonths: d.maturity_months ?? d.maturityMonths ?? 12,
        expectedRoi: d.expected_roi ?? d.expectedRoi ?? 0,
        riskLevel: d.risk_level ?? d.riskLevel ?? "low",
        coverImageUrl: d.cover_image_url ?? d.coverImageUrl ?? null,
        status: d.status ?? "draft",
      },
    });
    sendSuccess(res, mapLand(land as unknown as Record<string, unknown>), "Land created", 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const existing = await prisma.land.findUnique({ where: { id } });
    if (!existing) {
      sendNotFound(res, "Land not found");
      return;
    }
    const d = req.body;
    const land = await prisma.land.update({
      where: { id },
      data: {
        ...(d.project_id !== undefined && { projectId: d.project_id }),
        ...(d.projectId !== undefined && { projectId: d.projectId }),
        ...(d.title_ar !== undefined && { titleAr: d.title_ar }),
        ...(d.titleAr !== undefined && { titleAr: d.titleAr }),
        ...(d.title_en !== undefined && { titleEn: d.title_en }),
        ...(d.titleEn !== undefined && { titleEn: d.titleEn }),
        ...(d.description_ar !== undefined && { descriptionAr: d.description_ar }),
        ...(d.descriptionAr !== undefined && { descriptionAr: d.descriptionAr }),
        ...(d.description_en !== undefined && { descriptionEn: d.description_en }),
        ...(d.descriptionEn !== undefined && { descriptionEn: d.descriptionEn }),
        ...(d.asset_type !== undefined && { assetType: d.asset_type }),
        ...(d.assetType !== undefined && { assetType: d.assetType }),
        ...(d.country !== undefined && { country: d.country }),
        ...(d.city !== undefined && { city: d.city }),
        ...(d.area_m2 !== undefined && { areaM2: d.area_m2 }),
        ...(d.areaM2 !== undefined && { areaM2: d.areaM2 }),
        ...(d.total_sak_inventory !== undefined && { totalSakInventory: d.total_sak_inventory }),
        ...(d.totalSakInventory !== undefined && { totalSakInventory: d.totalSakInventory }),
        ...(d.available_sak !== undefined && { availableSak: d.available_sak }),
        ...(d.availableSak !== undefined && { availableSak: d.availableSak }),
        ...(d.maturity_months !== undefined && { maturityMonths: d.maturity_months }),
        ...(d.maturityMonths !== undefined && { maturityMonths: d.maturityMonths }),
        ...(d.expected_roi !== undefined && { expectedRoi: d.expected_roi }),
        ...(d.expectedRoi !== undefined && { expectedRoi: d.expectedRoi }),
        ...(d.risk_level !== undefined && { riskLevel: d.risk_level }),
        ...(d.riskLevel !== undefined && { riskLevel: d.riskLevel }),
        ...(d.cover_image_url !== undefined && { coverImageUrl: d.cover_image_url }),
        ...(d.coverImageUrl !== undefined && { coverImageUrl: d.coverImageUrl }),
        ...(d.status !== undefined && { status: d.status }),
      },
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
    await prisma.land.delete({ where: { id } });
    sendSuccess(res, null, "Land deleted");
  }
}

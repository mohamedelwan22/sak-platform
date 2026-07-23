import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
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
    gallery: land.gallery,
    documents: land.documents,
    lat: land.lat,
    lng: land.lng,
    status: land.status,
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

    sendSuccess(res, { data: mapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }, "Lands retrieved");
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
    sendSuccess(res, { ...mapped, sold_sak: totalInv - avail, holding_count: (obj._count as Record<string, unknown>)?.holdings ?? 0 }, "Land retrieved");
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
        gallery: d.gallery ?? [],
        documents: d.documents ?? [],
        lat: d.lat ?? null,
        lng: d.lng ?? null,
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
        ...(d.gallery !== undefined && { gallery: d.gallery }),
        ...(d.documents !== undefined && { documents: d.documents }),
        ...(d.lat !== undefined && { lat: d.lat }),
        ...(d.lng !== undefined && { lng: d.lng }),
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

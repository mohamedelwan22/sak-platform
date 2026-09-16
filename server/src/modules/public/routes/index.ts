import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { pricingService } from "../../../services/pricing.service.js";
import { validate } from "../../../middlewares/validate.middleware.js";

const router = Router();

function mapLand(land: Record<string, unknown>, pricePerSakUsd: number | null) {
  return {
    id: land.id,
    project_id: land.projectId,
    title_ar: land.titleAr,
    title_en: land.titleEn,
    description_ar: land.descriptionAr,
    description_en: land.descriptionEn,
    country: land.country,
    city: land.city,
    asset_type: land.assetType,
    area_m2: land.areaM2,
    expected_roi: land.expectedRoi,
    maturity_months: land.maturityMonths,
    total_sak_inventory: land.totalSakInventory,
    available_sak: land.availableSak,
    price_per_sak_usd: pricePerSakUsd,
    cover_image_url: land.coverImageUrl,
    gallery: land.gallery ?? [],
    lat: land.lat,
    lng: land.lng,
    status: land.status,
    use_type: land.useType ?? null,
    cultivation_status: land.cultivationStatus ?? null,
    acquisition_date: land.acquisitionDate ?? null,
    risk_level: land.riskLevel,
    created_at: land.createdAt,
    updated_at: land.updatedAt,
  };
}

function mapProject(project: Record<string, unknown>) {
  return {
    id: project.id,
    title_ar: project.titleAr,
    title_en: project.titleEn,
    description_ar: project.descriptionAr,
    country: project.country,
    city: project.city,
    cover_image_url: project.coverImageUrl ?? null,
    expected_roi: project.expectedRoi,
    sort_order: project.sortOrder,
    risk_level: project.riskLevel,
    status: project.status,
    created_at: project.createdAt,
  };
}

// --- Public query schemas ---

const publicProjectsQuerySchema = z.object({
  country: z.string().max(255).optional(),
  type: z.enum(["land", "hotel", "mall", "warehouse", "resort", "agricultural"]).optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  sort: z.enum(["sort_order_asc", "sort_order_desc", "created_at_asc", "created_at_desc", "expected_roi_desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  per_page: z.coerce.number().int().min(1).max(50).optional(),
});

const publicLandsQuerySchema = z.object({
  country: z.string().max(255).optional(),
  assetType: z.enum(["land", "agricultural", "hotel", "mall", "warehouse", "resort"]).optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["active", "partially_sold", "sold_out"]).optional(),
  sort: z.enum(["created_at_asc", "created_at_desc", "expected_roi_desc", "expected_roi_asc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  per_page: z.coerce.number().int().min(1).max(50).optional(),
});

// --- Endpoints ---

router.get("/gold-price", async (_req, res) => {
  const price = await prisma.goldPriceHistory.findFirst({
    orderBy: { createdAt: "desc" },
    select: { gramPriceUsd: true, createdAt: true },
  });
  sendSuccess(
    res,
    price ? { gram_price_usd: price.gramPriceUsd, created_at: price.createdAt } : null,
    "Gold price retrieved",
  );
});

router.get("/sak-config", async (_req, res) => {
  const now = new Date();
  const config = await prisma.sakConfig.findFirst({
    where: { effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: "desc" },
    select: { sakToGoldRatio: true, sellFeePercent: true, effectiveFrom: true },
  });
  sendSuccess(
    res,
    config
      ? {
          sak_to_gold_ratio: config.sakToGoldRatio,
          sell_fee_percent: config.sellFeePercent,
          effective_from: config.effectiveFrom,
        }
      : null,
    "SAK config retrieved",
  );
});

router.get("/sak-price", async (_req, res) => {
  const [price, gold, config] = await Promise.all([
    pricingService.getCurrentSakPriceOrNull(),
    prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
      select: { gramPriceUsd: true, createdAt: true },
    }),
    prisma.sakConfig.findFirst({
      where: { effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: "desc" },
      select: { sakToGoldRatio: true, sellFeePercent: true, effectiveFrom: true },
    }),
  ]);
  sendSuccess(
    res,
    price && gold && config
      ? {
          sak_price_usd: price,
          gram_price_usd: gold.gramPriceUsd,
          sak_to_gold_ratio: config.sakToGoldRatio,
          sell_fee_percent: config.sellFeePercent,
          effective_from: config.effectiveFrom,
          gold_updated_at: gold.createdAt,
        }
      : null,
    "SAK price retrieved",
  );
});

router.get("/projects", validate(publicProjectsQuerySchema, "query"), async (req, res) => {
  const { country, type, risk, sort, page, limit, per_page } = req.query;

  const pageNum = page ? Math.max(1, Number(page)) : 1;
  const limitNum = limit ?? per_page ? Math.min(50, Math.max(1, Number(limit ?? per_page))) : 50;
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = { status: "active" };
  if (country) where.country = String(country);
  if (risk) where.riskLevel = String(risk);
  if (type) where.lands = { some: { assetType: String(type) } };

  // Sorting
  let orderBy: Record<string, string> = { sortOrder: "asc" };
  if (sort === "sort_order_desc") orderBy = { sortOrder: "desc" };
  else if (sort === "created_at_asc") orderBy = { createdAt: "asc" };
  else if (sort === "created_at_desc") orderBy = { createdAt: "desc" };
  else if (sort === "expected_roi_desc") orderBy = { expectedRoi: "desc" };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    }),
    prisma.project.count({ where }),
  ]);

  sendSuccess(
    res,
    {
      data: projects.map((p) => mapProject(p as unknown as Record<string, unknown>)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    "Projects retrieved",
  );
});

router.get("/lands", validate(publicLandsQuerySchema, "query"), async (req, res) => {
  const { country, assetType, risk, status, sort, page, limit, per_page } = req.query;

  const pageNum = page ? Math.max(1, Number(page)) : 1;
  const limitNum = limit ?? per_page ? Math.min(50, Math.max(1, Number(limit ?? per_page))) : 50;
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
    status: status ? String(status) : { in: ["active", "partially_sold", "sold_out"] },
  };
  if (country) where.country = String(country);
  if (assetType) where.assetType = String(assetType);
  if (risk) where.riskLevel = String(risk);

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "created_at_asc") orderBy = { createdAt: "asc" };
  else if (sort === "expected_roi_desc") orderBy = { expectedRoi: "desc" };
  else if (sort === "expected_roi_asc") orderBy = { expectedRoi: "asc" };

  const [lands, total, price] = await Promise.all([
    prisma.land.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    }),
    prisma.land.count({ where }),
    pricingService.getCurrentSakPriceOrNull(),
  ]);

  const pricePerSakUsd = price ? price.toNumber() : null;
  sendSuccess(
    res,
    {
      data: lands.map((land) => mapLand(land as unknown as Record<string, unknown>, pricePerSakUsd)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    "Lands retrieved",
  );
});

router.get("/lands/:id", async (req, res) => {
  const [land, price] = await Promise.all([
    prisma.land.findUnique({ where: { id: String(req.params.id) } }),
    pricingService.getCurrentSakPriceOrNull(),
  ]);
  if (!land) {
    sendNotFound(res, "Land not found");
    return;
  }
  const pricePerSakUsd = price ? price.toNumber() : null;
  sendSuccess(
    res,
    mapLand(land as unknown as Record<string, unknown>, pricePerSakUsd),
    "Land retrieved",
  );
});

export default router;
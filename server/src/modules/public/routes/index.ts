import { Router } from "express";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess } from "../../../common/responses/index.js";

const router = Router();

function mapLand(land: Record<string, unknown>) {
  return {
    id: land.id,
    project_id: land.projectId,
    title_ar: land.titleAr,
    description_ar: land.descriptionAr,
    country: land.country,
    city: land.city,
    asset_type: land.assetType,
    area_m2: land.areaM2,
    expected_roi: land.expectedRoi,
    maturity_months: land.maturityMonths,
    total_sak_inventory: land.totalSakInventory,
    available_sak: land.availableSak,
    price_per_sak_usd: land.pricePerSakUsd,
    cover_image_url: land.coverImageUrl,
    gallery: land.gallery ?? [],
    documents: land.documents ?? [],
    lat: land.lat,
    lng: land.lng,
    status: land.status,
    created_at: land.createdAt,
    updated_at: land.updatedAt,
  };
}

function mapProject(project: Record<string, unknown>) {
  return {
    id: project.id,
    title_ar: project.titleAr,
    description_ar: project.descriptionAr,
    country: project.country,
    city: project.city,
    expected_roi: project.expectedRoi,
    sort_order: project.sortOrder,
    status: project.status,
    created_at: project.createdAt,
  };
}

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

router.get("/projects", async (_req, res) => {
  const projects = await prisma.project.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
  });
  sendSuccess(res, projects.map(mapProject), "Projects retrieved");
});

router.get("/lands", async (_req, res) => {
  const lands = await prisma.land.findMany({
    where: { status: { in: ["active", "partially_sold", "sold_out"] } },
    orderBy: { createdAt: "desc" },
  });
  sendSuccess(res, lands.map(mapLand), "Lands retrieved");
});

router.get("/lands/:id", async (req, res) => {
  const land = await prisma.land.findUnique({ where: { id: String(req.params.id) } });
  if (!land) {
    sendSuccess(res, null, "Land not found");
    return;
  }
  sendSuccess(res, mapLand(land as unknown as Record<string, unknown>), "Land retrieved");
});

export default router;

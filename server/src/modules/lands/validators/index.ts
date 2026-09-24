import { z } from "zod";
import { optionalHttpUrl } from "../../../common/validators/index.js";

export const LAND_ASSET_TYPES = [
  "land",
  "agricultural",
  "hotel",
  "mall",
  "warehouse",
  "resort",
] as const;

export const LAND_STATUSES = ["draft", "active", "partially_sold", "sold_out", "closed"] as const;

export const LAND_USE_TYPES = ["agricultural", "commercial", "industrial", "mixed"] as const;

export const LAND_CULTIVATION_STATUSES = ["cultivated", "uncultivated", "partial"] as const;

export const LAND_RISK_LEVELS = ["none", "low", "medium", "high"] as const;

const mediaArray = z.array(z.string().max(2048)).max(50).optional().default([]);

export const createLandSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  titleAr: z.string().min(1).max(255),
  titleEn: z.string().max(255).optional().default(""),
  descriptionAr: z.string().max(5000).optional().default(""),
  descriptionEn: z.string().max(5000).optional().default(""),
  assetType: z.enum(LAND_ASSET_TYPES).optional().default("land"),
  country: z.string().min(1).max(255),
  city: z.string().max(255).optional().default(""),
  areaM2: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  totalSakInventory: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  availableSak: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  maturityMonths: z.coerce.number().int().min(1).max(1200).optional().default(12),
  expectedRoi: z.coerce.number().min(0).max(1000).optional().default(0),
  riskLevel: z.enum(LAND_RISK_LEVELS).optional().default("low"),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  gallery: mediaArray,
  documents: mediaArray,
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  status: z.enum(LAND_STATUSES).optional().default("draft"),
  useType: z.enum(LAND_USE_TYPES).nullable().optional(),
  cultivationStatus: z.enum(LAND_CULTIVATION_STATUSES).nullable().optional(),
  acquisitionDate: z.string().date().nullable().optional(),
  publicDetailsUrl: optionalHttpUrl,
  googleMapsUrl: optionalHttpUrl,
});

export const updateLandSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  titleAr: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).optional(),
  descriptionAr: z.string().max(5000).optional(),
  descriptionEn: z.string().max(5000).optional(),
  assetType: z.enum(LAND_ASSET_TYPES).optional(),
  country: z.string().min(1).max(255).optional(),
  city: z.string().max(255).optional(),
  areaM2: z.coerce.number().min(0).max(1_000_000_000).optional(),
  totalSakInventory: z.coerce.number().min(0).max(1_000_000_000).optional(),
  availableSak: z.coerce.number().min(0).max(1_000_000_000).optional(),
  maturityMonths: z.coerce.number().int().min(1).max(1200).optional(),
  expectedRoi: z.coerce.number().min(0).max(1000).optional(),
  riskLevel: z.enum(LAND_RISK_LEVELS).optional(),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  gallery: z.array(z.string().max(2048)).max(50).optional(),
  documents: z.array(z.string().max(2048)).max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  status: z.enum(LAND_STATUSES).optional(),
  useType: z.enum(LAND_USE_TYPES).nullable().optional(),
  cultivationStatus: z.enum(LAND_CULTIVATION_STATUSES).nullable().optional(),
  acquisitionDate: z.string().date().nullable().optional(),
  publicDetailsUrl: optionalHttpUrl,
  googleMapsUrl: optionalHttpUrl,
});

export const listLandsQuerySchema = z.object({
  search: z.string().max(255).optional(),
  status: z.enum(LAND_STATUSES).optional(),
  assetType: z.enum(LAND_ASSET_TYPES).optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const publicLandsQuerySchema = z.object({
  country: z.string().max(255).optional(),
  assetType: z.enum(LAND_ASSET_TYPES).optional(),
  risk: z.enum(LAND_RISK_LEVELS).optional(),
  sort: z
    .enum(["created_at_asc", "created_at_desc", "expected_roi_desc", "expected_roi_asc"])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type CreateLandInput = z.infer<typeof createLandSchema>;
export type UpdateLandInput = z.infer<typeof updateLandSchema>;

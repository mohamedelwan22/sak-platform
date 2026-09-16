import { z } from "zod";

export const PROJECT_STATUSES = ["draft", "active", "sold_out", "closed"] as const;

export const PROJECT_RISK_LEVELS = ["none", "low", "medium", "high"] as const;

export const PROJECT_TYPES = [
  "land",
  "hotel",
  "mall",
  "warehouse",
  "resort",
  "agricultural",
] as const;

export const createProjectSchema = z.object({
  titleAr: z.string().min(1).max(255),
  titleEn: z.string().min(1).max(255),
  descriptionEn: z.string().max(5000).optional().default(""),
  descriptionAr: z.string().max(5000).optional().default(""),
  country: z.string().min(1).max(255),
  city: z.string().max(255).optional().default(""),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  gallery: z.array(z.string().max(2048)).max(50).optional().default([]),
  documents: z.array(z.string().max(2048)).max(50).optional().default([]),
  status: z.enum(PROJECT_STATUSES).optional().default("draft"),
  riskLevel: z.enum(PROJECT_RISK_LEVELS).optional().default("none"),
  expectedRoi: z.coerce.number().min(0).max(1000).optional().default(0),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const updateProjectSchema = z.object({
  titleAr: z.string().min(1).max(255).optional(),
  titleEn: z.string().min(1).max(255).optional(),
  descriptionEn: z.string().max(5000).optional(),
  descriptionAr: z.string().max(5000).optional(),
  country: z.string().min(1).max(255).optional(),
  city: z.string().max(255).optional(),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  gallery: z.array(z.string().max(2048)).max(50).optional(),
  documents: z.array(z.string().max(2048)).max(50).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  riskLevel: z.enum(PROJECT_RISK_LEVELS).optional(),
  expectedRoi: z.coerce.number().min(0).max(1000).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const listProjectsQuerySchema = z.object({
  search: z.string().max(255).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  sortBy: z.enum(["titleAr", "titleEn", "country", "status", "sortOrder", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

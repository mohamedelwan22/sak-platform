import { z } from "zod";

export const createProjectSchema = z.object({
  titleAr: z.string().min(1).max(255),
  titleEn: z.string().min(1).max(255),
  descriptionEn: z.string().optional().default(""),
  descriptionAr: z.string().optional().default(""),
  country: z.string().min(1).max(255),
  city: z.string().max(255).optional().default(""),
  coverImageUrl: z.string().max(512).nullable().optional(),
  gallery: z.array(z.unknown()).optional().default([]),
  documents: z.array(z.unknown()).optional().default([]),
  status: z.enum(["active", "inactive", "completed", "archived"]).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  expectedRoi: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateProjectSchema = z.object({
  titleAr: z.string().min(1).max(255).optional(),
  titleEn: z.string().min(1).max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  country: z.string().min(1).max(255).optional(),
  city: z.string().max(255).optional(),
  coverImageUrl: z.string().max(512).nullable().optional(),
  gallery: z.array(z.unknown()).optional(),
  documents: z.array(z.unknown()).optional(),
  status: z.enum(["active", "inactive", "completed", "archived"]).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  expectedRoi: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

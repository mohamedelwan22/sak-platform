import { z } from "zod";

export const AssetTypeDTO = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  nameEn: z.string(),
  nameAr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionAr: z.string().nullable(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.date(),
});

export const CreateAssetTypeDTO = z.object({
  slug: z.string().min(1).max(50),
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  sortOrder: z.number().default(0),
});

export const AssetFieldDefinitionDTO = z.object({
  id: z.string().uuid(),
  assetTypeId: z.string().uuid(),
  fieldKey: z.string(),
  labelEn: z.string(),
  labelAr: z.string(),
  fieldType: z.string(),
  isRequired: z.boolean(),
  isSearchable: z.boolean(),
  isFilterable: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number(),
});

export const CreateAssetFieldDTO = z.object({
  fieldKey: z.string().min(1).max(80),
  labelEn: z.string().min(1).max(150),
  labelAr: z.string().min(1).max(150),
  fieldType: z.enum([
    "text",
    "textarea",
    "number",
    "decimal",
    "boolean",
    "date",
    "select",
    "multi_select",
    "url",
    "image",
    "document",
  ]),
  isRequired: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  options: z
    .array(z.object({ value: z.string(), labelEn: z.string(), labelAr: z.string() }))
    .optional(),
  sortOrder: z.number().default(0),
});

export const HomepageConfigDTO = z.object({
  heroTitleEn: z.string(),
  heroTitleAr: z.string(),
  heroSubtitleEn: z.string(),
  heroSubtitleAr: z.string(),
  heroDescEn: z.string(),
  heroDescAr: z.string(),
  heroImageUrl: z.string().nullable(),
  heroCtaTextEn: z.string(),
  heroCtaTextAr: z.string(),
  heroCtaUrl: z.string(),
  heroEnabled: z.boolean(),
  sections: z.array(z.any()),
});

export type AssetType = z.infer<typeof AssetTypeDTO>;
export type CreateAssetTypeInput = z.infer<typeof CreateAssetTypeDTO>;
export type AssetFieldDefinition = z.infer<typeof AssetFieldDefinitionDTO>;
export type CreateAssetFieldInput = z.infer<typeof CreateAssetFieldDTO>;
export type HomepageConfig = z.infer<typeof HomepageConfigDTO>;

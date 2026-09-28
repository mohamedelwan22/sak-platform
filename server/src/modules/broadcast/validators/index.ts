import { z } from "zod";

const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http(s) URLs are allowed");

export const broadcastAudienceSchema = z.object({
  audienceType: z.enum(["ALL_INVESTORS", "ALL_BROKERS", "SPECIFIC_USERS", "SEGMENT"]),
  targetUserIds: z.array(z.string().uuid("Invalid user id")).max(1000).optional().nullable(),
  segmentKey: z.string().max(50).optional().nullable(),
});

export const createBroadcastSchema = z
  .object({
    titleEn: z.string().trim().min(3).max(255),
    titleAr: z.string().trim().min(3).max(255),
    messageEn: z.string().trim().min(3).max(8000),
    messageAr: z.string().trim().min(3).max(8000),
    ctaLabelEn: z.string().trim().max(100).optional().nullable(),
    ctaLabelAr: z.string().trim().max(100).optional().nullable(),
    externalUrl: safeUrl.optional().nullable(),
    imageUrl: safeUrl.optional().nullable(),
    showInTicker: z.boolean().default(true),
    isPublic: z.boolean().default(false),
  })
  .and(broadcastAudienceSchema)
  .superRefine((data, ctx) => {
    if (
      data.audienceType === "SPECIFIC_USERS" &&
      (!data.targetUserIds || data.targetUserIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetUserIds"],
        message: "Select at least one user",
      });
    }
    if (data.audienceType === "SEGMENT" && !data.segmentKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segmentKey"],
        message: "Select a segment",
      });
    }
  });

export const updateBroadcastSchema = z
  .object({
    titleEn: z.string().trim().min(3).max(255).optional(),
    titleAr: z.string().trim().min(3).max(255).optional(),
    messageEn: z.string().trim().min(3).max(8000).optional(),
    messageAr: z.string().trim().min(3).max(8000).optional(),
    ctaLabelEn: z.string().trim().max(100).nullable().optional(),
    ctaLabelAr: z.string().trim().max(100).nullable().optional(),
    externalUrl: safeUrl.nullable().optional(),
    imageUrl: safeUrl.nullable().optional(),
    showInTicker: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    audienceType: z.enum(["ALL_INVESTORS", "ALL_BROKERS", "SPECIFIC_USERS", "SEGMENT"]).optional(),
    targetUserIds: z.array(z.string().uuid()).max(1000).nullable().optional(),
    segmentKey: z.string().max(50).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const previewAudienceSchema = broadcastAudienceSchema;

export const userSearchSchema = z.object({
  search: z.string().trim().max(255).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

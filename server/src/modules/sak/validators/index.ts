import { z } from "zod";

export const createSakConfigSchema = z.object({
  sakToGoldRatio: z.number().positive("SAK-to-gold ratio must be greater than 0"),
  sellFeePercent: z
    .number()
    .min(0, "Sell fee must be at least 0")
    .max(100, "Sell fee must be at most 100"),
  effectiveFrom: z.string().datetime("Invalid date format"),
});

export const updateSakConfigSchema = z.object({
  sakToGoldRatio: z.number().positive("SAK-to-gold ratio must be greater than 0").optional(),
  sellFeePercent: z
    .number()
    .min(0, "Sell fee must be at least 0")
    .max(100, "Sell fee must be at most 100")
    .optional(),
  effectiveFrom: z.string().datetime("Invalid date format").optional(),
});

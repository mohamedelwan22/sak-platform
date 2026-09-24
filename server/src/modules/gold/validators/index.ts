import { z } from "zod";

const positiveNumber = z
  .number({ invalid_type_error: "Price must be a number" })
  .positive("Price must be greater than 0");

export const createGoldPriceSchema = z
  .object({
    gramPriceUsd: positiveNumber.optional(),
    pricePerOunce: positiveNumber.optional(),
    pricePerGram: positiveNumber.optional(),
    currency: z.string().min(1).max(10).optional(),
    source: z.string().min(1).max(50).optional(),
    sourceUpdatedAt: z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "sourceUpdatedAt must be a valid ISO 8601 date",
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.pricePerOunce !== undefined ||
      data.pricePerGram !== undefined ||
      data.gramPriceUsd !== undefined,
    { message: "At least one price (pricePerOunce, pricePerGram or gramPriceUsd) is required" },
  );

export type CreateGoldPriceBody = z.infer<typeof createGoldPriceSchema>;

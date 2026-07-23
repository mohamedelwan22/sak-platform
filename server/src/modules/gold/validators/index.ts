import { z } from "zod";

export const createGoldPriceSchema = z.object({
  gramPriceUsd: z.number().positive("Price must be greater than 0"),
  source: z.string().min(1).max(50).optional(),
});

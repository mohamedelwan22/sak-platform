import { z } from "zod";

export const createCitySchema = z.object({
  countryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
});

export const updateCitySchema = z.object({
  countryId: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

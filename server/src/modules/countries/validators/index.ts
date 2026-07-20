import { z } from "zod";

export const createCountrySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(3),
  iso2: z.string().max(2).nullable().optional(),
  iso3: z.string().max(3).nullable().optional(),
  phoneCode: z.string().max(10).nullable().optional(),
  currency: z.string().max(50).nullable().optional(),
  currencyCode: z.string().max(10).nullable().optional(),
  nationality: z.string().max(50).nullable().optional(),
  flag: z.string().max(512).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateCountrySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(3).optional(),
  iso2: z.string().max(2).nullable().optional(),
  iso3: z.string().max(3).nullable().optional(),
  phoneCode: z.string().max(10).nullable().optional(),
  currency: z.string().max(50).nullable().optional(),
  currencyCode: z.string().max(10).nullable().optional(),
  nationality: z.string().max(50).nullable().optional(),
  flag: z.string().max(512).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

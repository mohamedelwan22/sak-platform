import { z } from "zod";

const isoDate = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: "Must be a valid ISO 8601 date",
});

export const goldHistoryQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .refine((data) => !data.from || !data.to || new Date(data.from) <= new Date(data.to), {
    message: "'from' must be before or equal to 'to'",
    path: ["from"],
  });

export const manualOverrideSchema = z.object({
  pricePerOunce: z
    .number({ invalid_type_error: "pricePerOunce must be a number" })
    .positive("Price per ounce must be greater than zero"),
  reason: z
    .string({ required_error: "A reason is required for a manual override" })
    .trim()
    .min(10, "Reason must be at least 10 characters"),
  sourceUpdatedAt: isoDate.optional(),
});

export type GoldHistoryQuery = z.infer<typeof goldHistoryQuerySchema>;
export type ManualOverrideInput = z.infer<typeof manualOverrideSchema>;

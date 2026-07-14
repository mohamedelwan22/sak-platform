import { z } from "zod";

export const dateStringSchema = z.string().datetime("Invalid date format");
export const optionalDateSchema = z.coerce.date().optional();
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

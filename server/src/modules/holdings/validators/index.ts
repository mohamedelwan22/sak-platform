import { z } from "zod";

export const createHoldingSchema = z.object({
  landId: z.string().uuid(),
  sakOwned: z.number().positive(),
});

export const updateHoldingSchema = z.object({
  status: z.enum(["active", "matured", "sold", "closed"]).optional(),
});

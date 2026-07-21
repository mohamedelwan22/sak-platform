import { z } from "zod";

export const createWalletSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  balance: z.number().min(0, "Balance must be non-negative").optional(),
});

export const updateWalletSchema = z.object({
  status: z.enum(["active", "frozen", "closed"]).optional(),
  frozenBalance: z.number().min(0, "Frozen balance must be non-negative").optional(),
});

import { z } from "zod";

export const createProfitDistributionSchema = z.object({
  landId: z.string().uuid(),
  totalProfitUsd: z.number().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  payouts: z
    .array(
      z.object({
        userId: z.string().uuid(),
        holdingId: z.string().uuid(),
        ownershipPercent: z.number().min(0).max(100),
        payoutUsd: z.number().min(0),
        payoutSak: z.number().min(0),
      }),
    )
    .min(1),
});

export const profitDistributionPreviewSchema = z.object({
  landId: z.string().uuid(),
  totalProfitUsd: z.number().positive(),
});

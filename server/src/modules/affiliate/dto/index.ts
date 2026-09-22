import { z } from "zod";

export const CreateReferralLinkDTO = z.object({
  email: z.string().email(),
});

export const ReferralStatsDTO = z.object({
  referralCode: z.string(),
  referredCount: z.number().int().nonnegative(),
  totalCommissionsUsd: z.string(), // Decimal as string
  pendingCommissionsUsd: z.string(),
  approvedCommissionsUsd: z.string(),
  paidCommissionsUsd: z.string(),
});

export const CommissionHistoryItemDTO = z.object({
  id: z.string().uuid(),
  holdingId: z.string().uuid(),
  commissionType: z.string(),
  baseAmountUsd: z.string(),
  ratePercent: z.string(),
  commissionUsd: z.string(),
  commissionSak: z.string(),
  status: z.enum(["pending", "approved", "rejected", "paid", "cancelled"]),
  approvedAt: z.date().nullable(),
  paidAt: z.date().nullable(),
  createdAt: z.date(),
});

export const CommissionHistoryDTO = z.object({
  data: z.array(CommissionHistoryItemDTO),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const WithdrawalRequestDTO = z.object({
  commissionIds: z.array(z.string().uuid()),
  notes: z.string().optional(),
});

export const WithdrawalResponseDTO = z.object({
  withdrawalId: z.string().uuid(),
  totalAmountUsd: z.string(),
  totalAmountSak: z.string(),
  commissionCount: z.number().int().positive(),
  status: z.string(),
  createdAt: z.date(),
});

export type CreateReferralLinkInput = z.infer<typeof CreateReferralLinkDTO>;
export type ReferralStats = z.infer<typeof ReferralStatsDTO>;
export type CommissionHistory = z.infer<typeof CommissionHistoryDTO>;
export type WithdrawalRequest = z.infer<typeof WithdrawalRequestDTO>;
export type WithdrawalResponse = z.infer<typeof WithdrawalResponseDTO>;

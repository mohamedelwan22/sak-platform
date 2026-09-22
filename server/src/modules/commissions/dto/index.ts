import { z } from "zod";

export const CommissionRateDTO = z.object({
  id: z.string().uuid(),
  type: z.string(),
  ratePercent: z.string(),
  isDefault: z.boolean(),
  brokerId: z.string().uuid().nullable(),
  landId: z.string().uuid().nullable(),
  effectiveFrom: z.date(),
  expiresAt: z.date().nullable(),
  isActive: z.boolean(),
});

export const CreateCommissionRateDTO = z.object({
  type: z.enum(["referral", "broker"]),
  ratePercent: z.string().refine((val) => !isNaN(parseFloat(val))),
  isDefault: z.boolean().default(false),
  brokerId: z.string().uuid().optional(),
  landId: z.string().uuid().optional(),
  effectiveFrom: z.date(),
  expiresAt: z.date().optional(),
});

export const CommissionDTO = z.object({
  id: z.string().uuid(),
  beneficiaryId: z.string().uuid(),
  brokerId: z.string().uuid().nullable(),
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

export const ApproveCommissionDTO = z.object({
  commissionIds: z.array(z.string().uuid()),
  approvalNotes: z.string().optional(),
});

export type CommissionRate = z.infer<typeof CommissionRateDTO>;
export type CreateCommissionRateInput = z.infer<typeof CreateCommissionRateDTO>;
export type Commission = z.infer<typeof CommissionDTO>;
export type ApproveCommissionInput = z.infer<typeof ApproveCommissionDTO>;

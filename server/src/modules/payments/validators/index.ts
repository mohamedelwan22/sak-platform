import { z } from "zod";
import { PAYMENT_TYPES, PAYMENT_STATUSES } from "../constants/index.js";

export const createPaymentSchema = z.object({
  type: z.enum([PAYMENT_TYPES.DEPOSIT, PAYMENT_TYPES.WITHDRAWAL]),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,8})?$/, "Amount must be a positive decimal with up to 8 decimal places"),
  currency: z.string().min(1).max(10).default("USD"),
  proofPath: z.string().optional().nullable(),
});

export const reviewPaymentSchema = z.object({
  status: z.enum([PAYMENT_STATUSES.APPROVED, PAYMENT_STATUSES.REJECTED]),
  adminNotes: z.string().max(1000).optional(),
});

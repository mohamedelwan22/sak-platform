import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createTransactionSchema = z.object({
  walletId: z.string().min(1, "Wallet ID is required").regex(uuidRegex, "Invalid wallet ID format"),
  type: z.enum(["deposit", "withdrawal", "transfer_in", "transfer_out", "adjustment"], {
    errorMap: () => ({ message: "Invalid transaction type" }),
  }),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(999999999999.99999999, "Amount exceeds maximum allowed"),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
});

export const approveTransactionSchema = z.object({});

export const rejectTransactionSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, "Rejection reason is required")
    .max(500, "Rejection reason must be at most 500 characters"),
});

export const transactionQuerySchema = z.object({
  walletId: z.string().regex(uuidRegex, "Invalid wallet ID format").optional(),
  type: z.enum(["deposit", "withdrawal", "transfer_in", "transfer_out", "adjustment"]).optional(),
  status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

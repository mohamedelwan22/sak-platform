import { z } from "zod";
import { normalizePhone, DEFAULT_CALLING_CODE } from "../../../lib/phone.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepts any legitimate national or international shape and stores the
 * canonical E.164 form, so "01159279715" is accepted and persisted as
 * "+201159279716" rather than being rejected outright.
 */
const phoneSchema = z
  .string()
  .max(30, "Phone must be at most 30 characters")
  .transform((value, ctx) => {
    const result = normalizePhone(value, DEFAULT_CALLING_CODE);
    if (!result.valid || !result.e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.reason ?? "Invalid phone number format",
      });
      return z.NEVER;
    }
    return result.e164;
  });

export const createInvestorSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must be at most 255 characters")
    .regex(emailRegex, "Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be at most 100 characters"),
  phone: phoneSchema.nullable().optional(),
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
});

export const updateInvestorSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must be at most 255 characters")
    .regex(emailRegex, "Invalid email format")
    .optional(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters")
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be at most 100 characters")
    .optional(),
  phone: phoneSchema.nullable().optional(),
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
});

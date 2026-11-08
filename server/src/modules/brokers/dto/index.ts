import { z } from "zod";
import { normalizePhone, DEFAULT_CALLING_CODE } from "../../../lib/phone.js";

/**
 * Optional phone field: absent/empty means "not provided"; when present it must
 * be a genuinely dialable number and is normalised to E.164.
 */
const optionalPhone = z
  .string()
  .max(30, "Phone number must be 30 characters or less")
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (value == null || value.trim() === "") return undefined;
    const result = normalizePhone(value, `+${DEFAULT_CALLING_CODE}`);
    if (!result.valid || !result.e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.reason ?? "Invalid phone number format",
      });
      return z.NEVER;
    }
    return result.e164;
  });

export const BrokerProfileDTO = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  company: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  phone: z.string().nullable(),
  bio: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
  verifiedAt: z.date().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const CreateBrokerProfileDTO = z.object({
  displayName: z.string().min(2).max(100),
  company: z.string().max(150).optional(),
  licenseNumber: z.string().max(100).optional(),
  phone: optionalPhone,
  bio: z.string().optional(),
});

export const UpdateBrokerProfileDTO = z.object({
  displayName: z.string().min(2).max(100).optional(),
  company: z.string().max(150).optional(),
  phone: optionalPhone,
  bio: z.string().optional(),
});

export const VerifyBrokerDTO = z.object({
  brokerId: z.string().uuid(),
  verificationStatus: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().optional(),
});

export type BrokerProfile = z.infer<typeof BrokerProfileDTO>;
export type CreateBrokerProfileInput = z.infer<typeof CreateBrokerProfileDTO>;
export type UpdateBrokerProfileInput = z.infer<typeof UpdateBrokerProfileDTO>;
export type VerifyBrokerInput = z.infer<typeof VerifyBrokerDTO>;

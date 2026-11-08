import { z } from "zod";
import { normalizePhone, DEFAULT_CALLING_CODE } from "../../../lib/phone.js";

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
};

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or less`)
  .regex(passwordRegex.uppercase, "Password must contain at least one uppercase letter")
  .regex(passwordRegex.lowercase, "Password must contain at least one lowercase letter")
  .regex(passwordRegex.digit, "Password must contain at least one digit")
  .regex(passwordRegex.special, "Password must contain at least one special character");

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .toLowerCase()
  .trim();

export { passwordSchema, emailSchema };

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or less")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or less")
    .trim(),
  email: emailSchema,
  password: passwordSchema,
  // Phone is optional, but when provided it must be a genuinely dialable
  // number — it is normalised to E.164 before it is stored.
  phone: z
    .string()
    .max(30, "Phone number must be 30 characters or less")
    .trim()
    .optional()
    .nullable()
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
    }),
  accountType: z.enum(["investor", "broker"]).default("investor"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or account number is required")
    .max(255, "Account number or email is too long")
    .trim(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Verification code must be a 6-digit number"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export const googleAuthSchema = z.object({
  credential: z
    .string()
    .min(1, "Google credential is required")
    .max(8192, "Invalid Google credential"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

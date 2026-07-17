import { z } from "zod";

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
};

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
  email: z.string().min(1, "Email is required").email("Invalid email format").toLowerCase().trim(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or less`)
    .regex(passwordRegex.uppercase, "Password must contain at least one uppercase letter")
    .regex(passwordRegex.lowercase, "Password must contain at least one lowercase letter")
    .regex(passwordRegex.digit, "Password must contain at least one digit")
    .regex(passwordRegex.special, "Password must contain at least one special character"),
  phone: z
    .string()
    .max(30, "Phone number must be 30 characters or less")
    .trim()
    .optional()
    .nullable(),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

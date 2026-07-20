import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

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
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number format")
    .max(30, "Phone must be at most 30 characters")
    .nullable()
    .optional(),
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
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number format")
    .max(30, "Phone must be at most 30 characters")
    .nullable()
    .optional(),
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
});

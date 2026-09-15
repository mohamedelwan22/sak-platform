import { z } from "zod";

export const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be 100 characters or less")
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be 100 characters or less")
      .trim()
      .optional(),
    phone: z
      .string()
      .max(30, "Phone number must be 30 characters or less")
      .trim()
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.firstName !== undefined || data.lastName !== undefined || data.phone !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

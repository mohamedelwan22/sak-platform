import { z } from "zod";

/**
 * Frontend validation schema matching backend updateProfileSchema
 * Used for real-time validation and form submission validation
 */

const emptyToNull = (val: unknown) => (val === "" ? null : val);

const normalizeCountryCallingCode = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str.startsWith("+") ? str : `+${str}`;
};

/**
 * Profile field validation schema
 * Matches backend updateProfileSchema exactly
 */
export const profileFieldSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .min(2, { message: "validation.minLength" })
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(2, { message: "validation.minLength" })
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional(),
  fatherName: z
    .string()
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  dateOfBirth: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "validation.dateFormat",
    })
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    }, {
      message: "validation.dateFuture",
    })
    .optional()
    .nullable()
    .transform(emptyToNull),
  nationality: z
    .string()
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),

  // Contact Information
  phone: z
    .string()
    .max(30, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  countryCallingCode: z
    .preprocess(normalizeCountryCallingCode, z
      .string()
      .max(6, { message: "validation.maxLength" })
      .regex(/^\+\d{1,4}$/, { message: "validation.callingCodeFormat" })
      .optional()
      .nullable()
    ),
  whatsappNumber: z
    .string()
    .max(30, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  whatsappSameAsPhone: z.boolean().optional(),
  telegramUsername: z
    .string()
    .max(50, { message: "validation.maxLength" })
    .regex(/^[\p{L}\p{N}_]+$/u, {
      message: "validation.telegramUsername",
    })
    .optional()
    .nullable()
    .transform(emptyToNull),

  // Address Information
  countryId: z
    .union([z.string().uuid({ message: "validation.required" }), z.literal("")])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  cityId: z
    .union([z.string().uuid({ message: "validation.required" }), z.literal("")])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  governorate: z
    .string()
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  streetAddress: z
    .string()
    .max(255, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  postalCode: z
    .string()
    .max(20, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
    poBox: z
    .string()
    .max(50, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),

  // Professional Information
  employmentStatus: z
    .preprocess(emptyToNull, z
      .enum([
        "employed",
        "self_employed",
        "business_owner",
        "student",
        "retired",
        "unemployed",
        "freelancer",
        "other",
      ])
      .optional()
      .nullable()
    ),
  jobTitle: z
    .string()
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
  employer: z
    .string()
    .max(150, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),

  // Education Information
  educationLevel: z
    .preprocess(emptyToNull, z
      .enum(["basic", "secondary", "university", "postgraduate", "doctorate"])
      .optional()
      .nullable()
    ),
  fieldOfStudy: z
    .string()
    .max(100, { message: "validation.maxLength" })
    .trim()
    .optional()
    .nullable()
    .transform(emptyToNull),
});

export type ProfileFieldInput = z.infer<typeof profileFieldSchema>;

/**
 * Validates a single field
 * Returns error message or undefined if valid
 */
export function validateField(field: string, value: unknown): string | undefined {
  const fieldSchema = (profileFieldSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { errors: { message: string }[] } } }>)[field];
  if (!fieldSchema) return undefined;

  const result = fieldSchema.safeParse(value);
  if (!result.success) {
    return result.error?.errors[0]?.message;
  }
  return undefined;
}

/**
 * Validates entire profile object
 * Returns map of field errors
 */
export function validateProfile(data: Partial<ProfileFieldInput>): Record<string, string> {
  const result = profileFieldSchema.safeParse(data);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.errors) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
import { z } from "zod";
import { normalizePhone, DEFAULT_CALLING_CODE } from "../../../lib/phone.js";

const emptyToNull = (val: unknown) => (val === "" ? null : val);

// Normalize country calling code: ensure it starts with + and has 1-4 digits
const normalizeCountryCallingCode = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;
  // If already starts with +, keep as is; otherwise prepend +
  return str.startsWith("+") ? str : `+${str}`;
};

export const updateProfileSchema = z
  .object({
    // Personal Information
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(100, "First name must be 100 characters or less")
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(100, "Last name must be 100 characters or less")
      .trim()
      .optional(),
    fatherName: z
      .string()
      .max(100, "Father's name must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    dateOfBirth: z
      .string()
      .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Date must be in YYYY-MM-DD format")
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= today;
      }, "Date of birth cannot be in the future")
      .optional()
      .nullable()
      .transform(emptyToNull),
    nationality: z
      .string()
      .max(100, "Nationality must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),

    // Contact Information
    phone: z
      .string()
      .max(30, "Phone number must be 30 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    countryCallingCode: z
      .preprocess(normalizeCountryCallingCode, z
        .string()
        .max(6, "Country calling code must be 6 characters or less")
        .regex(/^\+\d{1,4}$/, "Country calling code must be in format +X, +XX, +XXX, or +XXXX")
        .optional()
        .nullable()
      ),
    whatsappNumber: z
      .string()
      .max(30, "WhatsApp number must be 30 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    whatsappSameAsPhone: z.boolean().optional(),
    telegramUsername: z
      .string()
      .max(50, "Telegram username must be 50 characters or less")
      .regex(
        /^[\p{L}\p{N}_]+$/u,
        "Telegram username must contain only letters, numbers, and underscores",
      )
      .optional()
      .nullable()
      .transform(emptyToNull),

    // Address Information
    countryId: z
      .union([z.string().uuid("Country ID must be a valid UUID"), z.literal("")])
      .optional()
      .nullable()
      .transform((val) => (val === "" ? null : val)),
    cityId: z
      .union([z.string().uuid("City ID must be a valid UUID"), z.literal("")])
      .optional()
      .nullable()
      .transform((val) => (val === "" ? null : val)),
    countryCode: z
      .string()
      .max(2, "Country code must be 2 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    stateCode: z
      .string()
      .max(10, "State code must be 10 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    cityName: z
      .string()
      .max(100, "City name must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    governorate: z
      .string()
      .max(100, "Governorate must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    streetAddress: z
      .string()
      .max(255, "Street address must be 255 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    postalCode: z
      .string()
      .max(20, "Postal code must be 20 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    poBox: z
      .string()
      .max(50, "P.O. Box must be 50 characters or less")
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
      .max(100, "Job title must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
    employer: z
      .string()
      .max(150, "Employer must be 150 characters or less")
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
      .max(100, "Field of study must be 100 characters or less")
      .trim()
      .optional()
      .nullable()
      .transform(emptyToNull),
  })
  .superRefine((data, ctx) => {
    // Validate phone numbers against the actual number formats of their
    // country (libphonenumber-js, max metadata). Optional fields — null
    // means "cleared", undefined means "not provided" — both pass.
    const callingCode = data.countryCallingCode ?? `+${DEFAULT_CALLING_CODE}`;
    const checkPhone = (field: "phone" | "whatsappNumber", value: unknown) => {
      if (typeof value !== "string" || value.length === 0) return;
      const result = normalizePhone(value, callingCode);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: result.reason ?? "Invalid phone number format",
        });
      }
    };
    checkPhone("phone", data.phone);
    checkPhone("whatsappNumber", data.whatsappNumber);
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== null), {
    message: "At least one field must be provided",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

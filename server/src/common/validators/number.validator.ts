import { z } from "zod";

export const positiveNumberSchema = z.coerce.number().positive("Must be positive");
export const nonNegativeNumberSchema = z.coerce.number().min(0, "Must be non-negative");
export const percentageSchema = z.coerce.number().min(0).max(100);

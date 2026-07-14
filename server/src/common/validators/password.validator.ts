import { z } from "zod";

// Placeholder - not enforcing complexity yet
export const passwordSchema = z.string().min(1, "Password is required");
export const passwordConfirmSchema = z.string();

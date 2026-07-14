import { z } from "zod";

export const booleanStringSchema = z.enum(["true", "false"]).transform((v) => v === "true");
export const optionalBooleanSchema = z.coerce.boolean().optional();

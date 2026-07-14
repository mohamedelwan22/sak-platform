import { z } from "zod";

// Generic factory for update DTOs (all fields partial)
export function createUpdateDto<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return schema.partial();
}

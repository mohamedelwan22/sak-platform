import { z } from "zod";

// Generic factory for create DTOs
export function createCreateDto<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

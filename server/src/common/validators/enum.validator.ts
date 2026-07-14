import { z } from "zod";

// Generic enum helper
export function createEnumSchema<T extends readonly [string, ...string[]]>(
  values: T,
  message?: string,
) {
  return z.enum(values, {
    errorMap: () => ({ message: message ?? `Must be one of: ${values.join(", ")}` }),
  });
}

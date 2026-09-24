import { z } from "zod";

const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:", "about:"];

export const optionalHttpUrl = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (val === undefined || val === null) return null;
    const trimmed = val.trim();
    if (trimmed === "") return null;
    return trimmed;
  })
  .pipe(
    z
      .string()
      .url({ message: "Invalid URL format" })
      .refine(
        (url) => {
          try {
            const parsed = new URL(url);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: "Only http:// and https:// URLs are allowed" },
      )
      .refine(
        (url) => {
          const lower = url.toLowerCase();
          return !dangerousProtocols.some((p) => lower.startsWith(p));
        },
        { message: "Dangerous URL protocol detected" },
      )
      .optional()
      .nullable(),
  );

export const requiredHttpUrl = z
  .string()
  .min(1, { message: "URL is required" })
  .url({ message: "Invalid URL format" })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Only http:// and https:// URLs are allowed" },
  )
  .refine(
    (url) => {
      const lower = url.toLowerCase();
      return !dangerousProtocols.some((p) => lower.startsWith(p));
    },
    { message: "Dangerous URL protocol detected" },
  );

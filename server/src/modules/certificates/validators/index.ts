import { z } from "zod";

export const generateCertificateSchema = z.object({
  holdingId: z.string().uuid(),
});

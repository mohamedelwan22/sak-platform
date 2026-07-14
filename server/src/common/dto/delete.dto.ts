import { z } from "zod";
import { uuidSchema } from "../validators/uuid.validator.js";

export const deleteDtoSchema = z.object({
  id: uuidSchema,
});
export type DeleteDto = z.infer<typeof deleteDtoSchema>;

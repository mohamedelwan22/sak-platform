import { z } from "zod";
import { uuidSchema } from "../validators/uuid.validator.js";

export const idParamDtoSchema = z.object({
  id: uuidSchema,
});
export type IdParamDto = z.infer<typeof idParamDtoSchema>;

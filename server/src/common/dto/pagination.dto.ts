import { z } from "zod";
import { paginationQuerySchema } from "../validators/pagination.validator.js";
import { sortingQuerySchema } from "../validators/sorting.validator.js";

export const paginationDtoSchema = paginationQuerySchema.merge(sortingQuerySchema);
export type PaginationDto = z.infer<typeof paginationDtoSchema>;

import { z } from "zod";

export const sortingQuerySchema = z.object({
  sortBy: z.string().min(1).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type SortingQuery = z.infer<typeof sortingQuerySchema>;

import type { PaginationMeta } from "../responses/api-response.js";

import { buildPaginationMeta } from "./pagination.meta.js";

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export function extractPaginationQuery(query: Record<string, unknown>): PaginationQuery {
  const result: PaginationQuery = {};

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (Number.isFinite(page) && page >= 1) {
      result.page = Math.floor(page);
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (Number.isFinite(limit) && limit >= 1 && limit <= 100) {
      result.limit = Math.floor(limit);
    }
  }

  if (typeof query.sortBy === "string" && query.sortBy.length > 0) {
    result.sortBy = query.sortBy;
  }

  if (query.sortOrder === "asc" || query.sortOrder === "desc") {
    result.sortOrder = query.sortOrder;
  }

  if (typeof query.search === "string" && query.search.length > 0) {
    result.search = query.search;
  }

  return result;
}

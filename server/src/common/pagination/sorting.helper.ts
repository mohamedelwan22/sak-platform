export interface SortOptions {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function parseSortParam(
  sortParam?: string,
  defaultSortBy = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): SortOptions {
  if (!sortParam || sortParam.length === 0) {
    return { sortBy: defaultSortBy, sortOrder: defaultOrder };
  }

  if (sortParam.startsWith("-")) {
    return {
      sortBy: sortParam.slice(1),
      sortOrder: "desc",
    };
  }

  const colonIndex = sortParam.indexOf(":");
  if (colonIndex !== -1) {
    const field = sortParam.slice(0, colonIndex);
    const order = sortParam.slice(colonIndex + 1);

    if (order === "asc" || order === "desc") {
      return { sortBy: field, sortOrder: order };
    }
  }

  return { sortBy: sortParam, sortOrder: defaultOrder };
}

export function buildOrderBy(
  sort: SortOptions,
  allowedFields: string[],
): Record<string, "asc" | "desc"> {
  if (!allowedFields.includes(sort.sortBy)) {
    return { createdAt: "desc" };
  }

  return { [sort.sortBy]: sort.sortOrder };
}

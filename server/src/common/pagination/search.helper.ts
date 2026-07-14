export function buildSearchClause(
  search: string | undefined,
  searchFields: string[],
): Record<string, unknown> | undefined {
  if (!search || search.trim().length === 0) {
    return undefined;
  }

  const trimmed = search.trim();

  if (searchFields.length === 0) {
    return undefined;
  }

  return {
    OR: searchFields.map((field) => ({
      [field]: { contains: trimmed, mode: "insensitive" },
    })),
  };
}

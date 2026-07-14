export interface PaginationDto {
  page: number;
  limit: number;
  offset: number;
}

const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function toPaginationDto(query: {
  page?: string | number;
  limit?: string | number;
}): PaginationDto {
  const page = Math.max(
    DEFAULT_PAGE,
    Number.isFinite(Number(query.page)) ? Math.floor(Number(query.page)) : DEFAULT_PAGE,
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.isFinite(Number(query.limit)) ? Math.floor(Number(query.limit)) : DEFAULT_LIMIT,
    ),
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

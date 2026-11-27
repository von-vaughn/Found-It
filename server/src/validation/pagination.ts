export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}

/**
 * Parses optional `limit` and `offset` query params with safe bounds.
 * Defaults preserve existing API behavior when omitted.
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaults: { limit: number; maxLimit: number },
): PaginationParams {
  const rawLimit =
    typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : NaN;
  const rawOffset =
    typeof query.offset === "string" ? Number.parseInt(query.offset, 10) : NaN;

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, defaults.maxLimit)
      : defaults.limit;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  return { limit, offset };
}

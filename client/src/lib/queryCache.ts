import type { InfiniteData } from "@tanstack/react-query";

/** Runtime check for TanStack Query's InfiniteData shape. */
export function isInfiniteData<TPage>(
  value: unknown,
): value is InfiniteData<TPage, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { pages?: unknown }).pages)
  );
}

/**
 * Prepends an item to the first page of an InfiniteData cache (removing any
 * duplicate with the same `id` across all pages). Returns the input untouched
 * if it is not an InfiniteData object.
 */
export function prependToInfinitePages<
  TKey extends string,
  TPage extends Record<TKey, Array<{ id: string }>>,
>(
  data: InfiniteData<TPage, unknown> | undefined,
  key: TKey,
  item: TPage[TKey][number],
): InfiniteData<TPage, unknown> | undefined {
  if (!isInfiniteData<TPage>(data) || data.pages.length === 0) return data;

  return {
    ...data,
    pages: data.pages.map((page, index) => {
      const filtered = page[key].filter((entry) => entry.id !== item.id);
      if (index === 0) {
        return {
          ...page,
          [key]: [item, ...filtered],
        };
      }
      return filtered.length === page[key].length
        ? page
        : { ...page, [key]: filtered };
    }),
  };
}

/**
 * Maps every item across every page of an InfiniteData cache.
 */
export function mapInfinitePages<
  TKey extends string,
  TPage extends Record<TKey, unknown[]>,
>(
  data: InfiniteData<TPage, unknown> | undefined,
  key: TKey,
  updater: (item: TPage[TKey][number]) => TPage[TKey][number],
): InfiniteData<TPage, unknown> | undefined {
  if (!isInfiniteData<TPage>(data)) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      [key]: page[key].map((entry) => updater(entry as TPage[TKey][number])),
    })),
  };
}

/**
 * Filters items across every page of an InfiniteData cache.
 */
export function filterInfinitePages<
  TKey extends string,
  TPage extends Record<TKey, unknown[]>,
>(
  data: InfiniteData<TPage, unknown> | undefined,
  key: TKey,
  predicate: (item: TPage[TKey][number]) => boolean,
): InfiniteData<TPage, unknown> | undefined {
  if (!isInfiniteData<TPage>(data)) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      [key]: page[key].filter((entry) => predicate(entry as TPage[TKey][number])),
    })),
  };
}

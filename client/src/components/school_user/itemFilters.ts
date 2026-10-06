import type { Item } from "@/data/mockItems";

/** Advanced filters kept separate from item-name search. */
export interface ItemFilters {
  location: string;
  color: string;
  dateFrom: string;
  dateTo: string;
}

export const defaultFilters: ItemFilters = {
  location: "",
  color: "",
  dateFrom: "",
  dateTo: "",
};

export function countActiveFilters(filters: ItemFilters): number {
  let count = 0;
  if (filters.location.trim()) count++;
  if (filters.color.trim()) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  return count;
}

export function applyAdvancedFilters(
  items: Item[],
  filters: ItemFilters,
): Item[] {
  const location = filters.location.trim().toLowerCase();
  const color = filters.color.trim().toLowerCase();

  return items.filter((item) => {
    if (location && !item.location.toLowerCase().includes(location)) {
      return false;
    }
    if (color) {
      if (!item.color || !item.color.toLowerCase().includes(color)) {
        return false;
      }
    }
    if (filters.dateFrom && item.date && item.date < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && item.date && item.date > filters.dateTo) {
      return false;
    }
    return true;
  });
}

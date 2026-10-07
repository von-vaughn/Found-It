import type { Item } from "@/data/mockItems";

/** Advanced filters kept separate from item-name search. */
export interface ItemFilters {
  location: string;
  color: string;
  dateTimeFrom: string;
  categories: string[];
  buildings: string[];
}

export const defaultFilters: ItemFilters = {
  location: "",
  color: "",
  dateTimeFrom: "",
  categories: [],
  buildings: [],
};

export function countActiveFilters(filters: ItemFilters): number {
  let count = 0;
  if (filters.location.trim()) count++;
  if (filters.color.trim()) count++;
  if (filters.dateTimeFrom) count++;
  if (filters.categories.length > 0) count++;
  if (filters.buildings.length > 0) count++;
  return count;
}

export function applyAdvancedFilters(
  items: Item[],
  filters: ItemFilters,
): Item[] {
  const location = filters.location.trim().toLowerCase();
  const color = filters.color.trim().toLowerCase();
  const dateTimeFrom = filters.dateTimeFrom
    ? new Date(filters.dateTimeFrom).getTime()
    : undefined;
  return items.filter((item) => {
    const itemTimeFrom = item.dateTime
      ? new Date(item.dateTime).getTime()
      : new Date(`${item.date}T00:00:00`).getTime();
    const itemTimeTo = item.dateTime
      ? itemTimeFrom
      : new Date(`${item.date}T23:59:59.999`).getTime();
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(item.category)
    ) {
      return false;
    }
    if (
      filters.buildings.length > 0 &&
      !filters.buildings.some((building) =>
        item.location.toLowerCase().includes(building.toLowerCase()),
      )
    ) {
      return false;
    }
    if (location && !item.location.toLowerCase().includes(location)) {
      return false;
    }
    if (color) {
      if (!item.color || !item.color.toLowerCase().includes(color)) {
        return false;
      }
    }
    if (dateTimeFrom !== undefined && itemTimeTo < dateTimeFrom) {
      return false;
    }
    return true;
  });
}

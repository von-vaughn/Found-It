import type { Item } from "@/data/mockItems";

/** Advanced filters kept separate from item-name search. */
export interface ItemFilters {
  color: string;
  dateTimeFrom: string;
  categories: string[];
  buildings: string[];
}

export const defaultFilters: ItemFilters = {
  color: "",
  dateTimeFrom: "",
  categories: [],
  buildings: [],
};

export function countActiveFilters(filters: ItemFilters): number {
  let count = 0;
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
      !filters.buildings.some((building) => {
        const normalizedBuilding = building.toLowerCase();
        return (
          item.location.toLowerCase().includes(normalizedBuilding) ||
          item.building?.toLowerCase().includes(normalizedBuilding)
        );
      })
    ) {
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

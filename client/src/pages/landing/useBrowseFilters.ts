import { useEffect, useState } from "react";
import {
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

const STORAGE_KEY = "foundit_browse_filters_v1";

function loadFilters(): ItemFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw) as {
      filters?: Partial<ItemFilters>;
    };
    return { ...defaultFilters, ...parsed.filters };
  } catch {
    return defaultFilters;
  }
}

function loadCategory(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "all";
    const parsed = JSON.parse(raw) as { selectedCategory?: unknown };
    return typeof parsed.selectedCategory === "string"
      ? parsed.selectedCategory
      : "all";
  } catch {
    return "all";
  }
}

/**
 * Browse filter state shared between /browse and /browse/filters.
 * Mirrors the dashboard pattern where filter state lives outside the
 * page so the mobile full-page filters edit the same values as the modal.
 */
export function useBrowseFilters() {
  const [filters, setFilters] = useState<ItemFilters>(loadFilters);
  const [selectedCategory, setSelectedCategory] =
    useState<string>(loadCategory);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filters, selectedCategory }),
      );
    } catch {
      /* storage unavailable — state still works for the session */
    }
  }, [filters, selectedCategory]);

  return { filters, setFilters, selectedCategory, setSelectedCategory };
}

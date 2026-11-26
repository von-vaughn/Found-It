import type { Item } from "@/data/mockItems";

/**
 * Determines which report type to display in the "Related <type> <category> reports" section:
 * - Own Lost post -> show Found items in the same category
 * - Own Found post -> show Lost items in the same category
 * - Someone else's post -> show the same type (Found -> Found, Lost -> Lost)
 */
export function resolveRelatedTargetType(
  currentType: Item["type"],
  isOwnItem: boolean,
): Item["type"] {
  if (isOwnItem) {
    return currentType === "lost" ? "found" : "lost";
  }
  return currentType;
}

export function selectRelatedItems(options: {
  currentItem: Pick<Item, "id" | "type" | "category">;
  candidates: readonly Item[];
  isOwnItem: boolean;
  viewerId?: string;
  limit?: number;
}): { targetType: Item["type"]; items: Item[] } {
  const { currentItem, candidates, isOwnItem, viewerId, limit = 4 } = options;
  const targetType = resolveRelatedTargetType(currentItem.type, isOwnItem);

  const items = candidates
    .filter((entry) => {
      if (entry.id === currentItem.id) return false;
      if (isOwnItem && viewerId && entry.reporterId === viewerId) return false;
      return entry.category === currentItem.category && entry.type === targetType;
    })
    .slice(0, limit);

  return { targetType, items };
}

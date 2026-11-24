export const ITEM_CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics",
  id: "ID",
  cards: "Cards",
  bags: "Bags",
  "wallets-purses": "Wallet",
  keys: "Keys",
  "clothing-accessories": "Clothing & Accessories",
  "books-school-supplies": "Books & School Supplies",
  jewelry: "Jewelry",
  eyewear: "Eyewear",
  tumblers: "Tumblers",
  umbrellas: "Umbrellas",
  "sports-gym-equipment": "Sports & Gym Equipment",
  "documents-papers": "Documents & Papers",
  other: "Other",
};

/** Returns true when a category slug or label represents the free-text "Other" bucket. */
export function isOtherCategory(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "other" || normalized === "others";
}

export function formatCategoryLabel(
  name: string,
  customCategory?: string | null,
): string {
  const base =
    ITEM_CATEGORY_LABELS[name] ??
    name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const trimmedCustom = customCategory?.trim();
  if (trimmedCustom && isOtherCategory(name)) {
    return `${base} (${trimmedCustom})`;
  }
  return base;
}

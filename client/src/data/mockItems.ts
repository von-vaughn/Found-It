import type { ItemCategory } from "@/data/itemCategories";

export interface Item {
  id: string;
  title: string;
  type: 'lost' | 'found';
  category: ItemCategory;
  building?: string;
  location: string;
  date: string;
  dateTime?: string;
  timeAgo: string;
  image: string;
  description: string;
  status: 'active' | 'reunited' | 'pending';
  reward?: string;
  color?: string;
  confidentialInfo?: string;
  contactName: string;
  username?: string;
  userAvatar?: string;
  likes?: number;
  commentsCount?: number;
  saved?: boolean;
}

/**
 * Shared empty fallback for `propItems ?? EMPTY_ITEMS` so memo dependency
 * arrays stay referentially stable. Contains no example data.
 */
export const EMPTY_ITEMS: Item[] = [];

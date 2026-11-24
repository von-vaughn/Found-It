import type { ItemCategory } from "@/data/itemCategories";

export interface Item {
  id: string;
  reporterId?: string;
  title: string;
  type: 'lost' | 'found';
  isClaimed?: boolean;
  isReturned?: boolean;
  hasReported?: boolean;
  category: ItemCategory;
  customCategory?: string;
  building?: string;
  location: string;
  date: string;
  dateTime?: string;
  timeAgo: string;
  image: string;
  images?: string[];
  description: string;
  status: 'active' | 'reunited' | 'pending';
  color?: string;
  confidentialInfo?: string;
  contactName: string;
  username?: string;
  userAvatar?: string;
}

/**
 * Shared empty fallback for `propItems ?? EMPTY_ITEMS` so memo dependency
 * arrays stay referentially stable. Contains no example data.
 */
export const EMPTY_ITEMS: Item[] = [];

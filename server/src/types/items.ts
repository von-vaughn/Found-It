export const REPORT_TYPES = ['lost', 'found'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface Item {
  id: string;
  reporterId: string;
  reportType: ReportType;
  isClaimed: boolean;
  isReturned: boolean;
  receivedByOsa?: boolean;
  name: string;
  description: string;
  /** Date the item was lost or found (YYYY-MM-DD). */
  itemDate: string;
  /** Time the item was lost or found (HH:MM), if given. */
  itemTime: string | null;
  categoryId: string;
  /** Category display name. */
  category: string;
  color: string | null;
  building: string | null;
  location: string | null;
  /** Primary image URL or null if no image attached. */
  image: string | null;
  /** All images associated with the item. */
  images: string[];
  /** Ownership-verification marker. Present for the report owner and admin+ only. */
  importantDetails?: string;
  /** Reporter identity. Email is included for admin/super_admin only. */
  user: { id: string; name: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

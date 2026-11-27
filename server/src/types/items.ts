export const REPORT_TYPES = ['lost', 'found'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface ItemFlag {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  createdAt: string;
}

export interface Item {
  id: string;
  reporterId: string;
  reportType: ReportType;
  isClaimed: boolean;
  isReturned: boolean;
  receivedByOsa?: boolean;
  lastFinderReminderAt?: string | null;
  name: string;
  description: string;
  /** Date the item was lost or found (YYYY-MM-DD). */
  itemDate: string;
  /** Time the item was lost or found (HH:MM), if given. */
  itemTime: string | null;
  categoryId: string;
  /** Category display name. */
  category: string;
  /** Free-text category detail entered when category is "other"/"others". */
  customCategory?: string | null;
  color: string | null;
  building: string | null;
  location: string | null;
  /** Primary image URL or null if no image attached. */
  image: string | null;
  /** All images associated with the item. */
  images: string[];
  /** Ownership-verification marker. Present for the report owner and admin+ only. */
  importantDetails?: string;
  /** Reporter identity. Email and schoolId are included for staff/admin only. */
  user: { id: string; name: string; email?: string; schoolId?: string };
  /** Claimant or finder who completed the claim/return (present for staff/admin only). */
  resolvedBy?: { id?: string | null; name: string; email?: string; schoolId?: string; isWalkIn?: boolean } | null;
  /** Staff or admin who marked the item claimed/returned (present for staff/admin only). */
  releasedBy?: { id: string; name: string; email?: string; role?: 'staff' | 'admin' } | null;
  /** Timestamp when the item was marked claimed/returned (present for staff/admin only). */
  releasedAt?: string | null;
  /** Open flag count and details (present for staff/admin only). */
  flagCount?: number;
  flags?: ItemFlag[];
  /** Whether the authenticated viewer has already flagged this post. */
  hasReported?: boolean;
  createdAt: string;
  updatedAt: string;
}

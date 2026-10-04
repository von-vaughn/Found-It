export const REPORT_TYPES = ['lost', 'found'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface Item {
  id: string;
  reporterId: string;
  reportType: ReportType;
  name: string;
  description: string;
  /** Date the item was lost or found (YYYY-MM-DD). */
  itemDate: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

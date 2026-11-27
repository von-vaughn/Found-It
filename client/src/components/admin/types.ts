import type { ItemFlag } from "@/services/itemService";

export type AdminSection =
  | "overview"
  | "items"
  | "post"
  | "reported"
  | "claims"
  | "walkin"
  | "users"
  | "audit";

export type RecordStatus = "Lost" | "Found" | "Returned" | "Claimed";

export type AdminUserRole = "school_user" | "staff" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isActive: boolean;
  joined: string;
  reportCount: number;
}

export interface AdminReport {
  id: string;
  title: string;
  type: "Lost" | "Found";
  receivedByOsa: boolean;
  lastFinderReminderAt?: string | null;
  image: string;
  category: string;
  description: string;
  building: string;
  buildingName?: string;
  specificLocation: string;
  color: string;
  reportedBy: string;
  reporterEmail: string;
  reporterSchoolId?: string;
  resolvedBy?: string;
  resolvedByEmail?: string;
  resolvedBySchoolId?: string;
  resolvedByIsWalkIn?: boolean;
  releasedBy?: string;
  releasedByRole?: "staff" | "admin";
  releasedAt?: string | null;
  status: RecordStatus;
  date: string;
  eventDateTime?: string;
  confidentialInfo?: string;
  flagCount?: number;
  flags?: ItemFlag[];
}

import type { ClaimRequest } from "@/types/claim";

export type AdminSection =
  | "overview"
  | "items"
  | "claims"
  | "returns"
  | "users"
  | "audit";

export type RecordStatus = "Lost" | "Found" | "Returned" | "Claimed";

export type AdminUserRole = "school_user" | "admin" | "super_admin";

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
  image: string;
  category: string;
  description: string;
  building: string;
  buildingName?: string;
  specificLocation: string;
  color: string;
  reportedBy: string;
  reporterEmail: string;
  status: RecordStatus;
  date: string;
  eventDateTime?: string;
  confidentialInfo?: string;
}

export type AdminClaim = ClaimRequest;

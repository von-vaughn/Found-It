import type { ClaimRequest } from "@/types/claim";

export type AdminSection = "overview" | "lost" | "found" | "claims";

export type RecordStatus = "Lost" | "Found" | "Returned" | "Claimed";

export interface AdminReport {
  id: string;
  title: string;
  type: "Lost" | "Found";
  image: string;
  category: string;
  description: string;
  building: string;
  color: string;
  reportedBy: string;
  status: RecordStatus;
  date: string;
}

export type AdminClaim = ClaimRequest;

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
  buildingName?: string;
  specificLocation: string;
  color: string;
  reportedBy: string;
  reporterEmail: string;
  status: RecordStatus;
  date: string;
  eventDateTime?: string;
}

export type AdminClaim = ClaimRequest;

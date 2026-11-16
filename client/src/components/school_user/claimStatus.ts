import type { ClaimRequest } from "@/types/claim";

export type SimplifiedClaimStatus =
  | "Pending"
  | "Approved"
  | "Claimed"
  | "Returned"
  | "Rejected";

export type StatusFilter = SimplifiedClaimStatus;

export const CLAIM_STATUS_TABS: readonly { id: StatusFilter; label: string }[] = [
  { id: "Pending", label: "Pending" },
  { id: "Approved", label: "Approved" },
  { id: "Claimed", label: "Claimed" },
  { id: "Returned", label: "Returned" },
  { id: "Rejected", label: "Rejected" },
];

export function simplifyClaimStatus(
  status: ClaimRequest["status"],
): SimplifiedClaimStatus {
  if (status === "Claimed") {
    return "Claimed";
  }
  if (status === "Returned") {
    return "Returned";
  }
  if (status === "Approved") {
    return "Approved";
  }
  if (status === "Rejected") {
    return "Rejected";
  }
  return "Pending";
}

export function submissionStatusLabel(
  claim: Pick<ClaimRequest, "status" | "kind">,
): SimplifiedClaimStatus {
  return simplifyClaimStatus(claim.status);
}

export const simplifiedClaimStatusStyles: Record<
  SimplifiedClaimStatus,
  string
> = {
  Pending: "bg-amber-500 text-white",
  Approved: "bg-emerald-600 text-white",
  Claimed: "bg-blue-600 text-white",
  Returned: "bg-teal-600 text-white",
  Rejected: "bg-rose-600 text-white",
};

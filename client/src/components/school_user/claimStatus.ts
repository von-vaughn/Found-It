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
  Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/25",
  Approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/25",
  Claimed: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/25",
  Returned:
    "bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-400 border border-teal-200/70 dark:border-teal-500/25",
  Rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/25",
};

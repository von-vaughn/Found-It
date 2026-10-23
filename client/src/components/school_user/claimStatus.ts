import type { ClaimRequest } from "@/types/claim";

export type SimplifiedClaimStatus =
  | "Pending"
  | "Approved"
  | "Claimed"
  | "Returned"
  | "Rejected";

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

/** Found reports call an approved (published, not yet returned) item unclaimed. */
export function submissionStatusLabel(
  claim: Pick<ClaimRequest, "status" | "kind">,
): SimplifiedClaimStatus | "Unclaimed" {
  if (claim.kind === "return" && claim.status === "Approved") {
    return "Unclaimed";
  }
  return simplifyClaimStatus(claim.status);
}

export const simplifiedClaimStatusStyles: Record<SimplifiedClaimStatus, string> = {
  Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/25",
  Approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/25",
  Claimed: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/25",
  Returned:
    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/25",
  Rejected: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800",
};

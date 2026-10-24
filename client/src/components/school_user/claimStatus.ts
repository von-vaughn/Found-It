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

/** Approved found reports have not yet been returned to their owner. */
export function submissionStatusLabel(
  claim: Pick<ClaimRequest, "status" | "kind">,
): SimplifiedClaimStatus | "Unreturned" {
  if (claim.kind === "return" && claim.status === "Approved") {
    return "Unreturned";
  }
  return simplifyClaimStatus(claim.status);
}

export const simplifiedClaimStatusStyles: Record<
  SimplifiedClaimStatus | "Unreturned",
  string
> = {
  Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/25",
  Approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/25",
  Claimed: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/25",
  Returned:
    "bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-400 border border-teal-200/70 dark:border-teal-500/25",
  Unreturned:
    "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-500/25",
  Rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/25",
};

import type { ClaimRequest } from "@/types/claim";

export type SimplifiedClaimStatus = "Pending" | "Approved" | "Rejected";

export function simplifyClaimStatus(
  status: ClaimRequest["status"],
): SimplifiedClaimStatus {
  if (status === "Approved" || status === "Claimed" || status === "Returned") {
    return "Approved";
  }
  if (status === "Rejected") {
    return "Rejected";
  }
  return "Pending";
}

export const simplifiedClaimStatusStyles: Record<SimplifiedClaimStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 border border-amber-200/70",
  Approved: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  Rejected: "bg-neutral-100 text-neutral-500 border border-neutral-200/70",
};

export function simplifiedStatusHint(status: SimplifiedClaimStatus): string {
  if (status === "Pending") {
    return "Waiting for admin review. We'll notify you once it changes.";
  }
  if (status === "Approved") {
    return "Approved. Proceed to the OSA office to claim the item.";
  }
  return "Not approved. Check the post details or try another report.";
}

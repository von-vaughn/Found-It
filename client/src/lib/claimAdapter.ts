import type { ClaimRequest } from "@/types/claim";
import type {
  ServerClaim,
  ServerClaimStatus,
} from "@/services/claimService";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const submittedFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusMap: Record<ServerClaimStatus, ClaimRequest["status"]> = {
  pending: "Pending",
  approved: "Approved",
  claimed: "Claimed",
  returned: "Returned",
  rejected: "Rejected",
};

function formatDateOnly(value: string | null): string {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatSubmitted(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : submittedFormatter.format(date);
}

/** Converts a saved server claim into the shape the school-user pages render. */
export function toClaimRequest(claim: ServerClaim): ClaimRequest {
  return {
    id: claim.id,
    itemId: claim.itemId,
    item: claim.item,
    claimant: claim.claimant,
    email: claim.email,
    dateLost: formatDateOnly(claim.dateLost),
    timeLost: claim.timeLost ?? "",
    location: claim.location ?? "",
    details: claim.details ?? "",
    importantDetails: claim.importantDetails ?? undefined,
    evidence: claim.evidence ?? [],
    claimantTitle: claim.claimantTitle ?? undefined,
    color: claim.color ?? undefined,
    building: claim.building ?? undefined,
    status: statusMap[claim.status],
    submitted: formatSubmitted(claim.submitted),
  };
}

export function toClaimRequests(claims: ServerClaim[]): ClaimRequest[] {
  return claims.map(toClaimRequest);
}

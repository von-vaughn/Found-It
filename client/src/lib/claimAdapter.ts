import type { ClaimRequest } from "@/types/claim";
import type {
  ServerClaim,
  ServerClaimStatus,
} from "@/services/claimService";
import type { ServerItem } from "@/services/itemService";

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

/** Converts a saved server return request into the shared school-user row. */
export function toFoundReportClaim(claim: ServerClaim): ClaimRequest {
  const request = toClaimRequest(claim);
  return {
    ...request,
    kind: "return",
    status: request.status === "Claimed" ? "Returned" : request.status,
  };
}

export function toFoundReportClaims(claims: ServerClaim[]): ClaimRequest[] {
  return claims.map(toFoundReportClaim);
}

/** Shows the found-post owner that another user has received the item. */
export function toReturnedFoundReportClaim(
  item: ServerItem,
): ClaimRequest | null {
  if (item.reportType !== "found" || !item.isReturned) return null;

  return {
    id: `returned-found-${item.id}`,
    itemId: item.id,
    item: item.name,
    claimant: item.user.name,
    dateLost: formatDateOnly(item.itemDate),
    timeLost: item.itemTime ?? "",
    location: item.location ?? "",
    details: item.description,
    evidence: item.images ?? (item.image ? [item.image] : []),
    claimantTitle: item.name,
    color: item.color ?? undefined,
    building: item.building ?? undefined,
    status: "Returned",
    kind: "return",
    submitted: formatSubmitted(item.createdAt),
  };
}

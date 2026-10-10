export interface ClaimRequest {
  id: string;
  status: "Pending" | "Under review" | "Approved" | "Claimed" | "Returned" | "Rejected";
  item: string;
  itemId: string;
  claimant: string;
  email?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  submitted: string;
  evidence?: string[];
}

export type NewClaimRequest = Omit<
  ClaimRequest,
  "id" | "status" | "submitted"
>;

export interface ReturnItemRequest extends ClaimRequest {
  sourceClaimId: string;
  lostItemTitle: string;
}

export type NewReturnItemRequest = Omit<
  ReturnItemRequest,
  "id" | "status" | "submitted"
>;

export function getClaimantEmail(
  claim: Pick<ClaimRequest, "claimant" | "email">,
): string {
  return (
    claim.email ??
    `${claim.claimant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}@wmsu.edu.ph`
  );
}

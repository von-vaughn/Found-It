export interface ClaimRequest {
  id: string;
  status: "Pending" | "Approved" | "Claimed" | "Returned" | "Rejected";
  /** Distinguishes an ownership claim from a found report on a lost item. */
  kind?: "claim" | "return";
  item: string;
  itemId: string;
  claimant: string;
  email?: string;
  schoolId?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  importantDetails?: string;
  submitted: string;
  evidence?: string[];
  claimantTitle?: string;
  color?: string;
  building?: string;
  receivedByOsa?: boolean;
  publishedItemId?: string | null;
  rejectionReason?: string | null;
  approvalInstructions?: string | null;
  lastFinderReminderAt?: string | null;
}

export type NewClaimRequest = Omit<
  ClaimRequest,
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

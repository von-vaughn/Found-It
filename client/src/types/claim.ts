export interface ClaimRequest {
  id: string;
  status: "Pending" | "Under review";
  item: string;
  itemId: string;
  claimant: string;
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

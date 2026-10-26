export const CLAIM_STATUSES = [
  "pending",
  "approved",
  "claimed",
  "returned",
  "rejected",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface Claim {
  id: string;
  itemId: string;
  item: string;
  claimant: string;
  email: string;
  dateLost: string | null;
  timeLost: string | null;
  location: string | null;
  details: string | null;
  importantDetails: string | null;
  evidence: string[];
  claimantTitle: string | null;
  color: string | null;
  building: string | null;
  receivedByOsa?: boolean;
  publishedItemId?: string | null;
  status: ClaimStatus;
  submitted: string;
}

export const CLAIM_STATUSES = [
  "pending",
  "approved",
  "claimed",
  "returned",
  "rejected",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface ClaimReleasedBy {
  id: string;
  name: string;
  email?: string;
  role?: "staff" | "admin";
}

export interface Claim {
  id: string;
  itemId: string;
  item: string;
  claimant: string;
  email: string;
  schoolId?: string;
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
  rejectionReason?: string | null;
  approvalInstructions?: string | null;
  lastFinderReminderAt?: string | null;
  releasedBy?: ClaimReleasedBy | null;
  releasedAt?: string | null;
  status: ClaimStatus;
  submitted: string;
}

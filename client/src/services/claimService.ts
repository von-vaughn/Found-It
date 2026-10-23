import api from "@/lib/api";

export type ServerClaimStatus =
  | "pending"
  | "approved"
  | "claimed"
  | "returned"
  | "rejected";

export interface ServerClaim {
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
  status: ServerClaimStatus;
  submitted: string;
}

export interface CreateClaimPayload {
  itemId: string;
  claimantTitle: string;
  color?: string;
  building?: string;
  dateLost: string;
  timeLost: string;
  location: string;
  details: string;
  importantDetails: string;
  evidence?: string[];
}

export type UpdateClaimPayload = Omit<CreateClaimPayload, "itemId">;

interface CreateClaimResponse {
  message: string;
  claim: ServerClaim;
}

interface ListClaimsResponse {
  claims: ServerClaim[];
  count: number;
}

interface UpdateClaimResponse {
  message: string;
  claim: ServerClaim;
}

/** POST /api/claims — save an ownership claim for the signed-in user. */
export async function createClaim(
  payload: CreateClaimPayload,
): Promise<ServerClaim> {
  const { data } = await api.post<CreateClaimResponse>("/claims", payload);
  return data.claim;
}

/** GET /api/claims — the signed-in user's own claims. */
export async function listMyClaims(): Promise<ServerClaim[]> {
  const { data } = await api.get<ListClaimsResponse>("/claims");
  return data.claims;
}

/** PATCH /api/claims/:id — update a pending ownership claim. */
export async function updateClaim(
  id: string,
  payload: UpdateClaimPayload,
): Promise<ServerClaim> {
  const { data } = await api.patch<UpdateClaimResponse>(`/claims/${id}`, payload);
  return data.claim;
}

/** DELETE /api/claims/:id — delete a pending ownership claim. */
export async function deleteClaim(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/claims/${id}`);
}

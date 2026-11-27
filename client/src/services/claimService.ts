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
  hasMore?: boolean;
}

export interface ListClaimsPageResult {
  claims: ServerClaim[];
  hasMore: boolean;
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

/** GET /api/claims/admin — paginated ownership claims (admin+). */
export async function listAllClaimsPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<ListClaimsPageResult> {
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);
  const { data } = await api.get<ListClaimsResponse>("/claims/admin", {
    params: query,
  });
  return {
    claims: data.claims,
    hasMore: Boolean(data.hasMore),
  };
}

/** GET /api/claims/admin — every ownership claim (admin+). */
export async function listAllClaims(): Promise<ServerClaim[]> {
  const { claims } = await listAllClaimsPage();
  return claims;
}

/** PATCH /api/claims/admin/:id/status — record an admin decision. */
export async function updateClaimStatus(
  id: string,
  status: Exclude<ServerClaimStatus, "pending">,
  reason?: string,
  instructions?: string,
): Promise<ServerClaim> {
  const { data } = await api.patch<UpdateClaimResponse>(
    `/claims/admin/${id}/status`,
    {
      status,
      ...(reason ? { reason } : {}),
      ...(instructions ? { instructions } : {}),
    },
  );
  return data.claim;
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

import api from "@/lib/api";
import type { ServerClaim } from "./claimService";

export interface CreateReturnPayload {
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

export type UpdateReturnPayload = Omit<CreateReturnPayload, "itemId">;

interface CreateReturnResponse {
  message: string;
  returnRequest: ServerClaim;
}

interface ListReturnsResponse {
  returns: ServerClaim[];
  count: number;
}

interface UpdateReturnResponse {
  message: string;
  returnRequest: ServerClaim;
}

/** POST /api/returns — report a found item on someone else's lost post. */
export async function createReturnRequest(
  payload: CreateReturnPayload,
): Promise<ServerClaim> {
  const { data } = await api.post<CreateReturnResponse>("/returns", payload);
  return data.returnRequest;
}

/** GET /api/returns — the signed-in user's own found reports. */
export async function listMyReturns(): Promise<ServerClaim[]> {
  const { data } = await api.get<ListReturnsResponse>("/returns");
  return data.returns;
}

/** PATCH /api/returns/:id — update a pending found report. */
export async function updateReturnRequest(
  id: string,
  payload: UpdateReturnPayload,
): Promise<ServerClaim> {
  const { data } = await api.patch<UpdateReturnResponse>(
    `/returns/${id}`,
    payload,
  );
  return data.returnRequest;
}

/** DELETE /api/returns/:id — delete a pending found report. */
export async function deleteReturnRequest(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/returns/${id}`);
}

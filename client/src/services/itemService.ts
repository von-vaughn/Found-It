import api from "@/lib/api";

// ─── Server response shapes ────────────────────────────────────────────────
export interface ServerItem {
  id: string;
  reporterId: string;
  reportType: "lost" | "found";
  name: string;
  description: string;
  itemDate: string;
  itemTime: string | null;
  categoryId: string;
  category: string;
  color: string | null;
  building: string | null;
  location: string | null;
  importantDetails?: string;
  user: { id: string; name: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

interface CreateItemResponse {
  message: string;
  item: ServerItem;
}

interface ListItemsResponse {
  items: ServerItem[];
  count: number;
}

interface GetItemResponse {
  item: ServerItem;
}

// ─── Request payloads ──────────────────────────────────────────────────────
export interface CreateItemPayload {
  reportType: "lost" | "found";
  name: string;
  description: string;
  itemDate: string;
  itemTime?: string;
  categoryId: string;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
}

export interface ListItemsParams {
  reportType?: "lost" | "found";
  categoryId?: string;
  search?: string;
  mine?: boolean;
}

// ─── API functions ─────────────────────────────────────────────────────────

/** POST /api/items — create a new lost/found report. */
export async function createItem(payload: CreateItemPayload): Promise<ServerItem> {
  const { data } = await api.post<CreateItemResponse>("/items", payload);
  return data.item;
}

/** GET /api/items — list all items (with optional filters). */
export async function listItems(params?: ListItemsParams): Promise<ServerItem[]> {
  const query: Record<string, string> = {};
  if (params?.reportType) query.reportType = params.reportType;
  if (params?.categoryId) query.categoryId = params.categoryId;
  if (params?.search) query.search = params.search;
  if (params?.mine) query.mine = "true";
  const { data } = await api.get<ListItemsResponse>("/items", { params: query });
  return data.items;
}

/** GET /api/items/:id — fetch a single item by ID. */
export async function getItemById(id: string): Promise<ServerItem> {
  const { data } = await api.get<GetItemResponse>(`/items/${id}`);
  return data.item;
}

/** GET /api/items?mine=true — convenience wrapper for the current user's own reports. */
export async function listMyItems(): Promise<ServerItem[]> {
  return listItems({ mine: true });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UpdateItemPayload {
  name?: string;
  description?: string;
  itemDate?: string;
  itemTime?: string;
  categoryId?: string;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
}

/** PATCH /api/items/:id — update an existing item report. */
export async function updateItem(
  id: string,
  payload: UpdateItemPayload,
): Promise<ServerItem> {
  const { data } = await api.patch<{ message: string; item: ServerItem }>(
    `/items/${id}`,
    payload,
  );
  return data.item;
}

/** DELETE /api/items/:id — delete an item report. */
export async function deleteItem(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/items/${id}`);
}

export default {
  createItem,
  listItems,
  getItemById,
  listMyItems,
  updateItem,
  deleteItem,
};


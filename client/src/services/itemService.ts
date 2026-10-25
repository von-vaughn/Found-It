import api from "@/lib/api";

// ─── Server response shapes ────────────────────────────────────────────────
export interface ServerItem {
  id: string;
  reporterId: string;
  reportType: "lost" | "found";
  isClaimed: boolean;
  isReturned: boolean;
  receivedByOsa?: boolean;
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
  image?: string | null;
  images?: string[];
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
  image?: string;
  images?: string[];
  blurredImage?: string;
  blurredImages?: string[];
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
  image?: string;
  images?: string[];
  blurredImage?: string;
  blurredImages?: string[];
}

export interface UploadImageResponse {
  message: string;
  url: string;
  urls: string[];
  blurredUrl?: string;
  blurredUrls?: string[];
  files: Array<{
    id: string;
    name: string;
    url: string;
    blurredUrl?: string;
    thumbnailUrl?: string;
  }>;
}

export interface UploadImageOptions {
  filename?: string;
  isFound?: boolean;
}

export interface UploadResult {
  url: string;
  blurredUrl?: string;
}

/**
 * Uploads a single image File or Blob to Google Drive via the server.
 * Returns the public direct CDN image URL.
 */
export async function uploadImage(
  file: File | Blob,
  filenameOrOptions?: string | UploadImageOptions,
): Promise<string> {
  const options: UploadImageOptions =
    typeof filenameOrOptions === "string"
      ? { filename: filenameOrOptions }
      : filenameOrOptions ?? {};

  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, options.filename || "capture.jpg");
  }
  if (options.isFound) {
    formData.append("isFound", "true");
  }
  try {
    const { data } = await api.post<UploadImageResponse>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.url;
  } catch (error: unknown) {
    throw new Error("The image couldn't be uploaded. Please try again.", {
      cause: error,
    });
  }
}

/**
 * Uploads a found item image and returns both the original URL and the server-blurred URL.
 */
export async function uploadFoundImage(
  file: File | Blob,
  filename?: string,
): Promise<UploadResult> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, filename || "found-capture.jpg");
  }
  formData.append("isFound", "true");
  try {
    const { data } = await api.post<UploadImageResponse>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return {
      url: data.url,
      blurredUrl: data.blurredUrl,
    };
  } catch (error: unknown) {
    throw new Error("The image couldn't be uploaded. Please try again.", {
      cause: error,
    });
  }
}

/**
 * Uploads multiple image Files or Blobs to Google Drive via the server.
 * Returns an array of public direct CDN image URLs.
 */
export async function uploadImages(files: (File | Blob)[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((f, index) => {
    if (f instanceof File) {
      formData.append("files", f);
    } else {
      formData.append("files", f, `image-${index + 1}.jpg`);
    }
  });
  try {
    const { data } = await api.post<UploadImageResponse>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.urls;
  } catch (error: unknown) {
    throw new Error("The image couldn't be uploaded. Please try again.", {
      cause: error,
    });
  }
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

/** PATCH /api/items/:id/osa-receipt — admin-only found-item custody update. */
export async function updateOsaReceipt(
  id: string,
  receivedByOsa: boolean,
): Promise<ServerItem> {
  const { data } = await api.patch<{ message: string; item: ServerItem }>(
    `/items/${id}/osa-receipt`,
    { receivedByOsa },
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
  uploadImage,
  uploadFoundImage,
  uploadImages,
};

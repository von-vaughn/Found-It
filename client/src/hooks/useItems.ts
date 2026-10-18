import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  createItem,
  listItems,
  listMyItems,
  getItemById,
  updateItem,
  deleteItem,
  UUID_RE,
  type CreateItemPayload,
  type UpdateItemPayload,
  type ListItemsParams,
  type ServerItem,
} from "@/services/itemService";

// ─── Query key factory ─────────────────────────────────────────────────────
export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (params?: ListItemsParams) => [...itemKeys.lists(), params ?? {}] as const,
  mine: () => [...itemKeys.all, "mine"] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// ─── GET /api/items (all items, with optional filters) ──────────────────────

export function useItems(
  params?: ListItemsParams,
  options?: Omit<UseQueryOptions<ServerItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ServerItem[], Error>({
    queryKey: itemKeys.list(params),
    queryFn: () => listItems(params),
    ...options,
  });
}

// ─── GET /api/items?mine=true (current user's own reports) ──────────────────

export function useMyItems(
  options?: Omit<UseQueryOptions<ServerItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ServerItem[], Error>({
    queryKey: itemKeys.mine(),
    queryFn: listMyItems,
    ...options,
  });
}

// ─── GET /api/items/:id (single item detail) ───────────────────────────────

export function useItemDetail(
  id: string,
  options?: Omit<UseQueryOptions<ServerItem, Error>, "queryKey" | "queryFn">,
) {
  const isUuid = Boolean(id && UUID_RE.test(id));
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: () => getItemById(id),
    enabled: isUuid,
    ...options,
  });
}

// ─── POST /api/items (create a new item report) ─────────────────────────────

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItemPayload) => createItem(payload),
    onSuccess: () => {
      // Invalidate both the full list and the user's own list so the new
      // item shows up immediately on the dashboard and profile pages.
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
    },
  });
}

// ─── PATCH /api/items/:id (update an item report) ───────────────────────────

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateItemPayload }) =>
      updateItem(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(data.id) });
    },
  });
}

// ─── DELETE /api/items/:id (delete an item report) ───────────────────────────

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
    },
  });
}


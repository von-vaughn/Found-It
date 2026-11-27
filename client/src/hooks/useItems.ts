import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  createItem,
  listItems,
  listItemsPage,
  listMyItems,
  getItemById,
  updateItem,
  updateOsaReceipt,
  remindFinder,
  flagItem,
  dismissItemFlags,
  deleteItem,
  UUID_RE,
  type CreateItemPayload,
  type UpdateItemPayload,
  type ListItemsParams,
  type ServerItem,
} from "@/services/itemService";
import { useAuth } from "@/context/useAuth";

function useViewerKey() {
  const { user } = useAuth();
  return user ? `${user.role}:${user.id}` : "guest";
}

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
  const viewerKey = useViewerKey();
  return useQuery<ServerItem[], Error>({
    queryKey: [...itemKeys.list(params), viewerKey],
    queryFn: () => listItems(params),
    ...options,
  });
}

export function useInfiniteItems(
  params?: Omit<ListItemsParams, "limit" | "offset">,
  pageSize = 24,
) {
  const viewerKey = useViewerKey();
  const query = useInfiniteQuery({
    queryKey: [...itemKeys.all, "infinite", params ?? {}, pageSize, viewerKey],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listItemsPage({ ...params, limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.items.length, 0);
    },
    staleTime: 30_000,
  });

  const items: ServerItem[] = [];
  const seen = new Set<string>();
  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return {
    ...query,
    items,
  };
}

// ─── GET /api/items?mine=true (current user's own reports) ──────────────────

export function useMyItems(
  options?: Omit<UseQueryOptions<ServerItem[], Error>, "queryKey" | "queryFn">,
) {
  const { user } = useAuth();
  const viewerKey = useViewerKey();
  return useQuery<ServerItem[], Error>({
    queryKey: [...itemKeys.mine(), viewerKey],
    queryFn: listMyItems,
    enabled: Boolean(user),
    ...options,
  });
}

// ─── GET /api/items/:id (single item detail) ───────────────────────────────

export function useItemDetail(
  id: string,
  options?: Omit<UseQueryOptions<ServerItem, Error>, "queryKey" | "queryFn">,
) {
  const viewerKey = useViewerKey();
  const isUuid = Boolean(id && UUID_RE.test(id));
  return useQuery({
    queryKey: [...itemKeys.detail(id), viewerKey],
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
    onSuccess: (created) => {
      // Insert the server-confirmed item into cached lists immediately so the
      // dashboard shows it without waiting for (or depending on) a refetch.
      queryClient.setQueriesData<ServerItem[]>(
        { queryKey: itemKeys.lists() },
        (current) =>
          current
            ? [created, ...current.filter((item) => item.id !== created.id)]
            : current,
      );
      queryClient.setQueriesData<ServerItem[]>(
        { queryKey: itemKeys.mine() },
        (current) =>
          current
            ? [created, ...current.filter((item) => item.id !== created.id)]
            : current,
      );
      // Invalidate both the full list and the user's own list so the new
      // item shows up immediately on the dashboard and profile pages.
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
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
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateOsaReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, receivedByOsa }: { id: string; receivedByOsa: boolean }) =>
      updateOsaReceipt(id, receivedByOsa),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useRemindFinder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remindFinder(id),
    onSuccess: (result, id) => {
      queryClient.setQueriesData<ServerItem[]>(
        { queryKey: itemKeys.lists() },
        (prev) =>
          Array.isArray(prev)
            ? prev.map((entry) =>
                entry.id === id
                  ? { ...entry, lastFinderReminderAt: result.lastFinderReminderAt }
                  : entry,
              )
            : prev,
      );
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

// ─── POST /api/items/:id/flag (flag an item post for admin review) ─────────

export function useFlagItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      flagItem(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.setQueriesData<ServerItem>(
        { queryKey: itemKeys.detail(id) },
        (prev) => (prev ? { ...prev, hasReported: true } : prev),
      );
      queryClient.setQueriesData<ServerItem[]>(
        { queryKey: itemKeys.lists() },
        (prev) =>
          Array.isArray(prev)
            ? prev.map((entry) =>
                entry.id === id ? { ...entry, hasReported: true } : entry,
              )
            : prev,
      );
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── PATCH /api/items/:id/flags/dismiss (dismiss open flags) ────────────────

export function useDismissItemFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dismissItemFlags(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

// ─── DELETE /api/items/:id (delete an item report) ───────────────────────────

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; reason?: string }) =>
      deleteItem(input),
    onSuccess: (_, variables) => {
      const id = typeof variables === "string" ? variables : variables.id;
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.mine() });
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

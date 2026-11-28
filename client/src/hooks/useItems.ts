import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
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
  type ListItemsPageResult,
  type ServerItem,
} from "@/services/itemService";
import { useAuth } from "@/context/useAuth";
import {
  filterInfinitePages,
  mapInfinitePages,
  prependToInfinitePages,
} from "@/lib/queryCache";

function useViewerKey() {
  const { user } = useAuth();
  return user ? `${user.role}:${user.id}` : "guest";
}

// ─── Query key factory ─────────────────────────────────────────────────────
export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (params?: ListItemsParams) => [...itemKeys.lists(), params ?? {}] as const,
  infinite: () => [...itemKeys.all, "infinite"] as const,
  mine: () => [...itemKeys.all, "mine"] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

type ItemCacheSnapshot = Array<[QueryKey, unknown]>;

function snapshotItemCaches(queryClient: QueryClient): ItemCacheSnapshot {
  return queryClient.getQueriesData({ queryKey: itemKeys.all });
}

function restoreItemCaches(
  queryClient: QueryClient,
  snapshot: ItemCacheSnapshot | undefined,
) {
  if (!snapshot) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function matchesListParams(
  params: ListItemsParams | undefined,
  item: ServerItem,
): boolean {
  if (!params) return true;
  if (params.reportType && params.reportType !== item.reportType) return false;
  if (params.categoryId && params.categoryId !== item.categoryId) return false;
  if (
    params.search &&
    !item.name.toLowerCase().includes(params.search.trim().toLowerCase())
  ) {
    return false;
  }
  return true;
}

function prependItemAcrossCaches(queryClient: QueryClient, created: ServerItem) {
  const listEntries = queryClient.getQueriesData<ServerItem[]>({
    queryKey: itemKeys.lists(),
  });
  for (const [key, current] of listEntries) {
    const params = key[2] as ListItemsParams | undefined;
    if (!Array.isArray(current) || !matchesListParams(params, created)) continue;
    queryClient.setQueryData<ServerItem[]>(key, [
      created,
      ...current.filter((item) => item.id !== created.id),
    ]);
  }

  const infiniteEntries = queryClient.getQueriesData<
    InfiniteData<ListItemsPageResult>
  >({ queryKey: itemKeys.infinite() });
  for (const [key, current] of infiniteEntries) {
    const params = key[2] as ListItemsParams | undefined;
    if (!current || !matchesListParams(params, created)) continue;
    queryClient.setQueryData<InfiniteData<ListItemsPageResult>>(
      key,
      prependToInfinitePages(current, "items", created),
    );
  }

  queryClient.setQueriesData<ServerItem[]>(
    { queryKey: itemKeys.mine() },
    (current) =>
      Array.isArray(current)
        ? [created, ...current.filter((item) => item.id !== created.id)]
        : current,
  );
  queryClient.setQueriesData<ServerItem>(
    { queryKey: itemKeys.detail(created.id) },
    () => created,
  );
}

function updateItemAcrossCaches(
  queryClient: QueryClient,
  id: string,
  updater: (item: ServerItem) => ServerItem,
) {
  const patchList = (current: ServerItem[] | undefined) =>
    Array.isArray(current)
      ? current.map((entry) => (entry.id === id ? updater(entry) : entry))
      : current;

  queryClient.setQueriesData<ServerItem[]>(
    { queryKey: itemKeys.lists() },
    patchList,
  );
  queryClient.setQueriesData<ServerItem[]>(
    { queryKey: itemKeys.mine() },
    patchList,
  );
  queryClient.setQueriesData<InfiniteData<ListItemsPageResult>>(
    { queryKey: itemKeys.infinite() },
    (current) =>
      mapInfinitePages(current, "items", (entry) =>
        entry.id === id ? updater(entry) : entry,
      ),
  );
  queryClient.setQueriesData<ServerItem>(
    { queryKey: itemKeys.detail(id) },
    (current) => (current ? updater(current) : current),
  );
}

function removeItemAcrossCaches(queryClient: QueryClient, id: string) {
  const filterList = (current: ServerItem[] | undefined) =>
    Array.isArray(current)
      ? current.filter((entry) => entry.id !== id)
      : current;

  queryClient.setQueriesData<ServerItem[]>(
    { queryKey: itemKeys.lists() },
    filterList,
  );
  queryClient.setQueriesData<ServerItem[]>(
    { queryKey: itemKeys.mine() },
    filterList,
  );
  queryClient.setQueriesData<InfiniteData<ListItemsPageResult>>(
    { queryKey: itemKeys.infinite() },
    (current) => filterInfinitePages(current, "items", (entry) => entry.id !== id),
  );
}

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
    queryKey: [...itemKeys.infinite(), params ?? {}, pageSize, viewerKey],
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
  const { enabled = true, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: [...itemKeys.detail(id), viewerKey],
    queryFn: () => getItemById(id),
    enabled: isUuid && enabled,
    ...restOptions,
  });
}

// ─── POST /api/items (create a new item report) ─────────────────────────────

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItemPayload) => createItem(payload),
    onSuccess: (created) => {
      // Insert the server-confirmed item into all cached lists & infinite pages
      // immediately so the dashboard, admin table, and profile show it right away.
      prependItemAcrossCaches(queryClient, created);
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
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
    onSuccess: (updated) => {
      updateItemAcrossCaches(queryClient, updated.id, () => updated);
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateOsaReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, receivedByOsa }: { id: string; receivedByOsa: boolean }) =>
      updateOsaReceipt(id, receivedByOsa),
    onMutate: async ({ id, receivedByOsa }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.all });
      const snapshot = snapshotItemCaches(queryClient);
      updateItemAcrossCaches(queryClient, id, (entry) => ({
        ...entry,
        receivedByOsa,
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreItemCaches(queryClient, context?.snapshot);
    },
    onSuccess: (updated) => {
      updateItemAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useRemindFinder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remindFinder(id),
    onSuccess: (result, id) => {
      updateItemAcrossCaches(queryClient, id, (entry) => ({
        ...entry,
        lastFinderReminderAt: result.lastFinderReminderAt,
      }));
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
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
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.all });
      const snapshot = snapshotItemCaches(queryClient);
      updateItemAcrossCaches(queryClient, id, (entry) => ({
        ...entry,
        hasReported: true,
        flagCount: (entry.flagCount ?? 0) + 1,
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreItemCaches(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── PATCH /api/items/:id/flags/dismiss (dismiss open flags) ────────────────

export function useDismissItemFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dismissItemFlags(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.all });
      const snapshot = snapshotItemCaches(queryClient);
      updateItemAcrossCaches(queryClient, id, (entry) => ({
        ...entry,
        flagCount: 0,
        flags: [],
      }));
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreItemCaches(queryClient, context?.snapshot);
    },
    onSuccess: (updated) => {
      updateItemAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
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
    onMutate: async (variables) => {
      const id = typeof variables === "string" ? variables : variables.id;
      await queryClient.cancelQueries({ queryKey: itemKeys.all });
      const snapshot = snapshotItemCaches(queryClient);
      removeItemAcrossCaches(queryClient, id);
      return { id, snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreItemCaches(queryClient, context?.snapshot);
    },
    onSuccess: (_, variables) => {
      const id = typeof variables === "string" ? variables : variables.id;
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

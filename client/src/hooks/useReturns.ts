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
import { useAuth } from "@/context/useAuth";
import { itemKeys } from "@/hooks/useItems";
import { notificationKeys } from "@/hooks/useNotifications";
import {
  filterInfinitePages,
  mapInfinitePages,
  prependToInfinitePages,
} from "@/lib/queryCache";
import type { ServerClaim, ServerClaimStatus } from "@/services/claimService";
import {
  createReturnRequest,
  createWalkInReturn,
  deleteReturnRequest,
  listAllReturns,
  listAllReturnsPage,
  listItemReturns,
  listMyReturns,
  publishRejectedReturn,
  remindReturnFinder,
  type CreateReturnPayload,
  type CreateWalkInReturnPayload,
  type PublishReturnResponse,
  type UpdateReturnPayload,
  updateReturnRequest,
  updateReturnOsaReceipt,
  updateReturnStatus,
} from "@/services/returnService";

type ReturnsPage = { returns: ServerClaim[]; hasMore: boolean };

export const returnKeys = {
  all: ["returns"] as const,
  admin: () => [...returnKeys.all, "admin"] as const,
  adminInfinite: () => [...returnKeys.all, "admin-infinite"] as const,
  mineAll: () => [...returnKeys.all, "mine"] as const,
  mine: (userId?: string) =>
    [...returnKeys.mineAll(), userId ?? "anonymous"] as const,
  itemsAll: () => [...returnKeys.all, "item"] as const,
  item: (itemId?: string) =>
    [...returnKeys.itemsAll(), itemId ?? "unknown"] as const,
};

type ReturnCacheSnapshot = Array<[QueryKey, unknown]>;

function snapshotReturnCaches(queryClient: QueryClient): ReturnCacheSnapshot {
  return queryClient.getQueriesData({ queryKey: returnKeys.all });
}

function restoreReturnCaches(
  queryClient: QueryClient,
  snapshot: ReturnCacheSnapshot | undefined,
) {
  if (!snapshot) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function prependReturnAcrossCaches(
  queryClient: QueryClient,
  created: ServerClaim,
) {
  const prependArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? [created, ...current.filter((entry) => entry.id !== created.id)]
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.mineAll() },
    prependArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.admin() },
    prependArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.item(created.itemId) },
    prependArray,
  );
  queryClient.setQueriesData<InfiniteData<ReturnsPage>>(
    { queryKey: returnKeys.adminInfinite() },
    (current) => prependToInfinitePages(current, "returns", created),
  );
}

function updateReturnAcrossCaches(
  queryClient: QueryClient,
  id: string,
  updater: (entry: ServerClaim) => ServerClaim,
) {
  const patchArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? current.map((entry) => (entry.id === id ? updater(entry) : entry))
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.mineAll() },
    patchArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.admin() },
    patchArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.itemsAll() },
    patchArray,
  );
  queryClient.setQueriesData<InfiniteData<ReturnsPage>>(
    { queryKey: returnKeys.adminInfinite() },
    (current) =>
      mapInfinitePages(current, "returns", (entry) =>
        entry.id === id ? updater(entry) : entry,
      ),
  );
}

function removeReturnAcrossCaches(queryClient: QueryClient, id: string) {
  const filterArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? current.filter((entry) => entry.id !== id)
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.mineAll() },
    filterArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.admin() },
    filterArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: returnKeys.itemsAll() },
    filterArray,
  );
  queryClient.setQueriesData<InfiniteData<ReturnsPage>>(
    { queryKey: returnKeys.adminInfinite() },
    (current) =>
      filterInfinitePages(current, "returns", (entry) => entry.id !== id),
  );
}

/** The signed-in user's saved found reports. */
export function useMyReturns(
  options?: Omit<
    UseQueryOptions<ServerClaim[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const { user } = useAuth();
  return useQuery<ServerClaim[], Error>({
    queryKey: returnKeys.mine(user?.id),
    queryFn: listMyReturns,
    enabled: Boolean(user),
    staleTime: 30_000,
    ...options,
  });
}

/** Every return request, for the admin returns workspace. */
export function useAdminReturns() {
  return useQuery<ServerClaim[], Error>({
    queryKey: returnKeys.admin(),
    queryFn: listAllReturns,
    staleTime: 15_000,
  });
}

/** Paginated admin returns with Load More support. */
export function useInfiniteAdminReturns(pageSize = 50) {
  const query = useInfiniteQuery({
    queryKey: [...returnKeys.adminInfinite(), pageSize],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listAllReturnsPage({ limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.returns.length, 0);
    },
    staleTime: 15_000,
  });

  const returns: ServerClaim[] = [];
  const seen = new Set<string>();
  for (const page of query.data?.pages ?? []) {
    for (const entry of page.returns) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        returns.push(entry);
      }
    }
  }

  return {
    ...query,
    returns,
  };
}

/** Return reports filed for a specific item (for lost item owner or admin). */
export function useItemReturns(
  itemId?: string,
  options?: Omit<
    UseQueryOptions<ServerClaim[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const { user } = useAuth();
  return useQuery<ServerClaim[], Error>({
    queryKey: returnKeys.item(itemId),
    queryFn: () => listItemReturns(itemId!),
    enabled: Boolean(user && itemId),
    staleTime: 15_000,
    ...options,
  });
}

/** Saves a found report and refreshes the user's list. */
export function useCreateReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => createReturnRequest(payload),
    onSuccess: (created) => {
      prependReturnAcrossCaches(queryClient, created);
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      // A 409 means another tab/session already saved this report.
      if ((error as { response?: { status?: number } }).response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: returnKeys.all });
      }
    },
  });
}

/** Records a walk-in return at OSA and refreshes returns, items, notifications, and audit logs. */
export function useCreateWalkInReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWalkInReturnPayload) =>
      createWalkInReturn(payload),
    onSuccess: (created) => {
      prependReturnAcrossCaches(queryClient, created);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Records an admin decision and refreshes every cached return list. */
export function useUpdateAdminReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      instructions,
    }: {
      id: string;
      status: Exclude<ServerClaimStatus, "pending" | "claimed">;
      instructions?: string;
    }) => updateReturnStatus(id, status, instructions),
    onMutate: async ({ id, status, instructions }) => {
      await queryClient.cancelQueries({ queryKey: returnKeys.all });
      const snapshot = snapshotReturnCaches(queryClient);
      updateReturnAcrossCaches(queryClient, id, (request) => ({
        ...request,
        status,
        ...(instructions !== undefined
          ? { approvalInstructions: instructions }
          : {}),
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreReturnCaches(queryClient, context?.snapshot);
    },
    onSuccess: (updated) => {
      updateReturnAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Sends an OSA surrender reminder notification to the finder (3-hour cooldown). */
export function useRemindReturnFinder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: remindReturnFinder,
    onSuccess: (result, id) => {
      updateReturnAcrossCaches(queryClient, id, (request) => ({
        ...request,
        lastFinderReminderAt: result.lastFinderReminderAt,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Publishes a rejected found report and refreshes the related admin lists. */
export function usePublishRejectedReturn() {
  const queryClient = useQueryClient();

  return useMutation<PublishReturnResponse, Error, string>({
    mutationFn: publishRejectedReturn,
    onSuccess: (result, id) => {
      updateReturnAcrossCaches(queryClient, id, (request) => ({
        ...request,
        publishedItemId: result.itemId,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateAdminReturnOsaReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      receivedByOsa,
    }: {
      id: string;
      receivedByOsa: boolean;
    }) => updateReturnOsaReceipt(id, receivedByOsa),
    onMutate: async ({ id, receivedByOsa }) => {
      await queryClient.cancelQueries({ queryKey: returnKeys.all });
      const snapshot = snapshotReturnCaches(queryClient);
      updateReturnAcrossCaches(queryClient, id, (request) => ({
        ...request,
        receivedByOsa,
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreReturnCaches(queryClient, context?.snapshot);
    },
    onSuccess: (updated) => {
      updateReturnAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Updates a pending found report and synchronizes every cached return list. */
export function useUpdateReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReturnPayload }) =>
      updateReturnRequest(id, payload),
    onSuccess: (updated) => {
      updateReturnAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: returnKeys.all }),
  });
}

/** Deletes a pending found report and synchronizes every cached return list. */
export function useDeleteReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReturnRequest,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: returnKeys.all });
      const snapshot = snapshotReturnCaches(queryClient);
      removeReturnAcrossCaches(queryClient, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreReturnCaches(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

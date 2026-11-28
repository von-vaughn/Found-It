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
import {
  createClaim,
  createWalkInClaim,
  deleteClaim,
  listAllClaims,
  listAllClaimsPage,
  listMyClaims,
  updateClaimStatus,
  type CreateWalkInClaimPayload,
  type ListClaimsPageResult,
  type ServerClaim,
  type ServerClaimStatus,
  type UpdateClaimPayload,
  updateClaim,
} from "@/services/claimService";

export const claimKeys = {
  all: ["claims"] as const,
  admin: () => [...claimKeys.all, "admin"] as const,
  adminInfinite: () => [...claimKeys.all, "admin-infinite"] as const,
  mineAll: () => [...claimKeys.all, "mine"] as const,
  mine: (userId?: string) =>
    [...claimKeys.mineAll(), userId ?? "anonymous"] as const,
};

type ClaimCacheSnapshot = Array<[QueryKey, unknown]>;

function snapshotClaimCaches(queryClient: QueryClient): ClaimCacheSnapshot {
  return queryClient.getQueriesData({ queryKey: claimKeys.all });
}

function restoreClaimCaches(
  queryClient: QueryClient,
  snapshot: ClaimCacheSnapshot | undefined,
) {
  if (!snapshot) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function prependClaimAcrossCaches(
  queryClient: QueryClient,
  created: ServerClaim,
) {
  const prependArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? [created, ...current.filter((claim) => claim.id !== created.id)]
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.mineAll() },
    prependArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.admin() },
    prependArray,
  );
  queryClient.setQueriesData<InfiniteData<ListClaimsPageResult>>(
    { queryKey: claimKeys.adminInfinite() },
    (current) => prependToInfinitePages(current, "claims", created),
  );
}

function updateClaimAcrossCaches(
  queryClient: QueryClient,
  id: string,
  updater: (claim: ServerClaim) => ServerClaim,
) {
  const patchArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? current.map((claim) => (claim.id === id ? updater(claim) : claim))
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.mineAll() },
    patchArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.admin() },
    patchArray,
  );
  queryClient.setQueriesData<InfiniteData<ListClaimsPageResult>>(
    { queryKey: claimKeys.adminInfinite() },
    (current) =>
      mapInfinitePages(current, "claims", (claim) =>
        claim.id === id ? updater(claim) : claim,
      ),
  );
}

function removeClaimAcrossCaches(queryClient: QueryClient, id: string) {
  const filterArray = (current: ServerClaim[] | undefined) =>
    Array.isArray(current)
      ? current.filter((claim) => claim.id !== id)
      : current;

  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.mineAll() },
    filterArray,
  );
  queryClient.setQueriesData<ServerClaim[]>(
    { queryKey: claimKeys.admin() },
    filterArray,
  );
  queryClient.setQueriesData<InfiniteData<ListClaimsPageResult>>(
    { queryKey: claimKeys.adminInfinite() },
    (current) => filterInfinitePages(current, "claims", (claim) => claim.id !== id),
  );
}

/** The signed-in user's saved claim requests. */
export function useMyClaims(
  options?: Omit<
    UseQueryOptions<ServerClaim[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const { user } = useAuth();
  return useQuery<ServerClaim[], Error>({
    queryKey: claimKeys.mine(user?.id),
    queryFn: listMyClaims,
    enabled: Boolean(user),
    staleTime: 30_000,
    ...options,
  });
}

/** Every claim, for the admin claims workspace. */
export function useAdminClaims() {
  return useQuery<ServerClaim[], Error>({
    queryKey: claimKeys.admin(),
    queryFn: listAllClaims,
    staleTime: 15_000,
  });
}

/** Paginated admin claims with Load More support. */
export function useInfiniteAdminClaims(pageSize = 50) {
  const query = useInfiniteQuery({
    queryKey: [...claimKeys.adminInfinite(), pageSize],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listAllClaimsPage({ limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.claims.length, 0);
    },
    staleTime: 15_000,
  });

  const claims: ServerClaim[] = [];
  const seen = new Set<string>();
  for (const page of query.data?.pages ?? []) {
    for (const claim of page.claims) {
      if (!seen.has(claim.id)) {
        seen.add(claim.id);
        claims.push(claim);
      }
    }
  }

  return {
    ...query,
    claims,
  };
}

/** Records an admin decision and refreshes every cached claim list. */
export function useUpdateAdminClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
      instructions,
    }: {
      id: string;
      status: Exclude<ServerClaimStatus, "pending">;
      reason?: string;
      instructions?: string;
    }) => updateClaimStatus(id, status, reason, instructions),
    onMutate: async ({ id, status, reason, instructions }) => {
      await queryClient.cancelQueries({ queryKey: claimKeys.all });
      const snapshot = snapshotClaimCaches(queryClient);
      updateClaimAcrossCaches(queryClient, id, (claim) => ({
        ...claim,
        status,
        ...(reason !== undefined ? { rejectionReason: reason } : {}),
        ...(instructions !== undefined
          ? { approvalInstructions: instructions }
          : {}),
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreClaimCaches(queryClient, context?.snapshot);
    },
    onSuccess: (updated) => {
      updateClaimAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Records a completed walk-in claim (registered user or guest) and refreshes caches. */
export function useCreateWalkInClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWalkInClaimPayload) =>
      createWalkInClaim(payload),
    onSuccess: (created) => {
      prependClaimAcrossCaches(queryClient, created);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/** Saves a claim and refreshes the user's claim list. */
export function useCreateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClaim,
    onSuccess: (created) => {
      prependClaimAcrossCaches(queryClient, created);
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      // A 409 means another tab/session already saved this claim; refresh the list.
      if ((error as { response?: { status?: number } }).response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: claimKeys.all });
      }
    },
  });
}

/** Updates a pending claim and synchronizes every cached claim list. */
export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClaimPayload }) =>
      updateClaim(id, payload),
    onSuccess: (updated) => {
      updateClaimAcrossCaches(queryClient, updated.id, () => updated);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

/** Deletes a pending claim and synchronizes every cached claim list. */
export function useDeleteClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClaim,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: claimKeys.all });
      const snapshot = snapshotClaimCaches(queryClient);
      removeClaimAcrossCaches(queryClient, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreClaimCaches(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

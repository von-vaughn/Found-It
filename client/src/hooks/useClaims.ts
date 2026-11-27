import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { itemKeys } from "@/hooks/useItems";
import { notificationKeys } from "@/hooks/useNotifications";
import {
  createClaim,
  createWalkInClaim,
  deleteClaim,
  listAllClaims,
  listAllClaimsPage,
  listMyClaims,
  updateClaimStatus,
  type CreateWalkInClaimPayload,
  type ServerClaim,
  type ServerClaimStatus,
  type UpdateClaimPayload,
  updateClaim,
} from "@/services/claimService";

export const claimKeys = {
  all: ["claims"] as const,
  admin: () => [...claimKeys.all, "admin"] as const,
  mine: (userId?: string) =>
    [...claimKeys.all, "mine", userId ?? "anonymous"] as const,
};

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
    queryKey: [...claimKeys.all, "admin-infinite", pageSize],
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
    onSuccess: (updated) => {
      queryClient.setQueryData<ServerClaim[]>(claimKeys.admin(), (current) =>
        current?.map((claim) =>
          claim.id === updated.id ? updated : claim,
        ),
      );
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
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: claimKeys.all },
        (current) =>
          current
            ? [created, ...current.filter((claim) => claim.id !== created.id)]
            : current,
      );
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
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
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: claimKeys.all },
        (current) =>
          current?.map((claim) => (claim.id === updated.id ? updated : claim)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

/** Deletes a pending claim and synchronizes every cached claim list. */
export function useDeleteClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClaim,
    onSuccess: (_result, id) => {
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: claimKeys.all },
        (current) => current?.filter((claim) => claim.id !== id),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

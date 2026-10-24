import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { itemKeys } from "@/hooks/useItems";
import {
  createClaim,
  deleteClaim,
  listAllClaims,
  listMyClaims,
  updateClaimStatus,
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

/** Records an admin decision and refreshes every cached claim list. */
export function useUpdateAdminClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<ServerClaimStatus, "pending">;
    }) => updateClaimStatus(id, status),
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

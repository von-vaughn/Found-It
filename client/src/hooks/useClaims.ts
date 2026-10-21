import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import {
  createClaim,
  listMyClaims,
  type ServerClaim,
} from "@/services/claimService";

export const claimKeys = {
  all: ["claims"] as const,
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
  });
}

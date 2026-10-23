import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import type { ServerClaim } from "@/services/claimService";
import {
  createReturnRequest,
  listMyReturns,
  type CreateReturnPayload,
} from "@/services/returnService";

export const returnKeys = {
  all: ["returns"] as const,
  mine: (userId?: string) =>
    [...returnKeys.all, "mine", userId ?? "anonymous"] as const,
};

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

/** Saves a found report and refreshes the user's list. */
export function useCreateReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => createReturnRequest(payload),
    onSuccess: (created) => {
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: returnKeys.all },
        (current) =>
          current
            ? [created, ...current.filter((entry) => entry.id !== created.id)]
            : current,
      );
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
    },
    onError: (error) => {
      // A 409 means another tab/session already saved this report.
      if ((error as { response?: { status?: number } }).response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: returnKeys.all });
      }
    },
  });
}

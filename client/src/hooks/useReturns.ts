import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { itemKeys } from "@/hooks/useItems";
import type { ServerClaim, ServerClaimStatus } from "@/services/claimService";
import {
  createReturnRequest,
  deleteReturnRequest,
  listAllReturns,
  listItemReturns,
  listMyReturns,
  type CreateReturnPayload,
  type UpdateReturnPayload,
  updateReturnRequest,
  updateReturnOsaReceipt,
  updateReturnStatus,
} from "@/services/returnService";

export const returnKeys = {
  all: ["returns"] as const,
  admin: () => [...returnKeys.all, "admin"] as const,
  mine: (userId?: string) =>
    [...returnKeys.all, "mine", userId ?? "anonymous"] as const,
  item: (itemId?: string) =>
    [...returnKeys.all, "item", itemId ?? "unknown"] as const,
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

/** Every return request, for the admin returns workspace. */
export function useAdminReturns() {
  return useQuery<ServerClaim[], Error>({
    queryKey: returnKeys.admin(),
    queryFn: listAllReturns,
    staleTime: 15_000,
  });
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

/** Records an admin decision and refreshes every cached return list. */
export function useUpdateAdminReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<ServerClaimStatus, "claimed">;
    }) => updateReturnStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<ServerClaim[]>(returnKeys.admin(), (current) =>
        current?.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
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
    onSuccess: (updated) => {
      queryClient.setQueryData<ServerClaim[]>(returnKeys.admin(), (current) =>
        current?.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: returnKeys.all });
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
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: returnKeys.all },
        (current) =>
          current?.map((request) =>
            request.id === updated.id ? updated : request,
          ),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: returnKeys.all }),
  });
}

/** Deletes a pending found report and synchronizes every cached return list. */
export function useDeleteReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReturnRequest,
    onSuccess: (_result, id) => {
      queryClient.setQueriesData<ServerClaim[]>(
        { queryKey: returnKeys.all },
        (current) => current?.filter((request) => request.id !== id),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: returnKeys.all }),
  });
}

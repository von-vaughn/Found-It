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
import type { ServerClaim, ServerClaimStatus } from "@/services/claimService";
import {
  createReturnRequest,
  deleteReturnRequest,
  listAllReturns,
  listAllReturnsPage,
  listItemReturns,
  listMyReturns,
  publishRejectedReturn,
  remindReturnFinder,
  type CreateReturnPayload,
  type PublishReturnResponse,
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

/** Paginated admin returns with Load More support. */
export function useInfiniteAdminReturns(pageSize = 50) {
  const query = useInfiniteQuery({
    queryKey: [...returnKeys.all, "admin-infinite", pageSize],
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
      instructions,
    }: {
      id: string;
      status: Exclude<ServerClaimStatus, "pending" | "claimed">;
      instructions?: string;
    }) => updateReturnStatus(id, status, instructions),
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
      queryClient.setQueryData<ServerClaim[]>(returnKeys.admin(), (current) =>
        current?.map((request) =>
          request.id === id
            ? { ...request, lastFinderReminderAt: result.lastFinderReminderAt }
            : request,
        ),
      );
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

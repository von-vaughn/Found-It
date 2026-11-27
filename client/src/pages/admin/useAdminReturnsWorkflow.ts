import { useMemo } from "react";
import toast from "react-hot-toast";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { toFoundReportClaims } from "@/lib/claimAdapter";
import {
  useInfiniteAdminReturns,
  usePublishRejectedReturn,
  useRemindReturnFinder,
  useUpdateAdminReturnOsaReceipt,
  useUpdateAdminReturnStatus,
} from "@/hooks/useReturns";
import { useItems } from "@/hooks/useItems";
import type { ClaimRequest } from "@/types/claim";

const RESOLVED_RETURN_STATUSES: ClaimRequest["status"][] = ["Returned"];

/** Shared data and mutations for the admin return items list and detail pages. */
export function useAdminReturnsWorkflow() {
  const {
    returns: serverReturns,
    isLoading: returnsLoading,
    isError: returnsError,
    refetch: refetchReturns,
    hasNextPage: hasMoreReturns,
    isFetchingNextPage: isFetchingMoreReturns,
    fetchNextPage: fetchMoreReturns,
  } = useInfiniteAdminReturns(50);
  const {
    data: serverItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useItems();
  const updateReturnStatus = useUpdateAdminReturnStatus();
  const updateOsaReceipt = useUpdateAdminReturnOsaReceipt();
  const publishRejected = usePublishRejectedReturn();
  const remindFinderMutation = useRemindReturnFinder();

  const handleRemindFinder = (id: string) => {
    remindFinderMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Surrender reminder sent to the finder.");
      },
      onError: (error) => {
        const message = (
          error as { response?: { data?: { message?: string } } }
        )?.response?.data?.message;
        toast.error(
          message || "Could not send reminder to the finder. Please try again.",
        );
      },
    });
  };

  const requests = useMemo(
    () => toFoundReportClaims(serverReturns),
    [serverReturns],
  );
  const reports = useMemo(
    () => serverItems.map(serverItemToAdminReport),
    [serverItems],
  );

  const visibleRequests = useMemo(() => {
    const resolvedItemIds = new Set(
      requests
        .filter((request) => RESOLVED_RETURN_STATUSES.includes(request.status))
        .map((request) => request.itemId),
    );
    for (const report of reports) {
      if (report.status === "Returned" || report.status === "Claimed") {
        resolvedItemIds.add(report.id);
      }
    }
    // Exclude items that have already been returned or claimed; they remain visible on the Items page.
    return requests.filter((request) => !resolvedItemIds.has(request.itemId));
  }, [requests, reports]);

  const physicalItemReceived = (request: ClaimRequest) => {
    const publishedItem = request.publishedItemId
      ? reports.find((report) => report.id === request.publishedItemId)
      : undefined;
    return publishedItem?.receivedByOsa ?? request.receivedByOsa ?? false;
  };

  const refetch = () => {
    void refetchReturns();
    void refetchItems();
  };

  return {
    requests,
    visibleRequests,
    reports,
    isLoading: returnsLoading || itemsLoading,
    isError: returnsError || itemsError,
    refetch,
    hasMore: Boolean(hasMoreReturns),
    isFetchingMore: isFetchingMoreReturns,
    fetchMore: () => void fetchMoreReturns(),
    physicalItemReceived,
    updateReturnStatus,
    updateOsaReceipt,
    publishRejected,
    handleRemindFinder,
    isRemindingFinder: remindFinderMutation.isPending,
    remindingReturnId: remindFinderMutation.variables,
  };
}

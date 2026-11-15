import { useMemo } from "react";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { toFoundReportClaims } from "@/lib/claimAdapter";
import {
  useAdminReturns,
  usePublishRejectedReturn,
  useUpdateAdminReturnOsaReceipt,
  useUpdateAdminReturnStatus,
} from "@/hooks/useReturns";
import { useItems } from "@/hooks/useItems";
import type { ClaimRequest } from "@/types/claim";

const RESOLVED_RETURN_STATUSES: ClaimRequest["status"][] = [
  "Approved",
  "Returned",
];

/** Shared data and mutations for the admin return items list and detail pages. */
export function useAdminReturnsWorkflow() {
  const {
    data: serverReturns = [],
    isLoading: returnsLoading,
    isError: returnsError,
    refetch: refetchReturns,
  } = useAdminReturns();
  const {
    data: serverItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useItems();
  const updateReturnStatus = useUpdateAdminReturnStatus();
  const updateOsaReceipt = useUpdateAdminReturnOsaReceipt();
  const publishRejected = usePublishRejectedReturn();

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
    // Once one request is approved for an item, the other requests for
    // that item are resolved away — only show the approved one.
    return requests.filter(
      (request) =>
        !resolvedItemIds.has(request.itemId) ||
        RESOLVED_RETURN_STATUSES.includes(request.status),
    );
  }, [requests]);

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
    physicalItemReceived,
    updateReturnStatus,
    updateOsaReceipt,
    publishRejected,
  };
}

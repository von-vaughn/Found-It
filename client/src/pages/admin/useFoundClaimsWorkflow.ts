import { useMemo } from "react";
import toast from "react-hot-toast";
import type { ClaimRequest } from "@/types/claim";
import type { ServerClaimStatus } from "@/services/claimService";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { toClaimRequests } from "@/lib/claimAdapter";
import { useAdminClaims, useUpdateAdminClaimStatus } from "@/hooks/useClaims";
import { useItems, useUpdateOsaReceipt } from "@/hooks/useItems";

const ADMIN_STATUS: Partial<
  Record<ClaimRequest["status"], Exclude<ServerClaimStatus, "pending">>
> = {
  Approved: "approved",
  Rejected: "rejected",
  Claimed: "claimed",
  Returned: "returned",
};

const RESOLVED_CLAIM_STATUSES = new Set(["Approved", "Claimed", "Returned"]);

/** Shared data and mutations for the admin claims list and claim detail pages. */
export function useFoundClaimsWorkflow() {
  const {
    data: serverClaims = [],
    isLoading: claimsLoading,
    isError: claimsError,
    refetch: refetchClaims,
  } = useAdminClaims();
  const {
    data: serverItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useItems();
  const updateClaimStatus = useUpdateAdminClaimStatus();
  const updateOsaReceipt = useUpdateOsaReceipt();

  const allClaims = useMemo(
    () => toClaimRequests(serverClaims),
    [serverClaims],
  );
  const reports = useMemo(
    () => serverItems.map(serverItemToAdminReport),
    [serverItems],
  );
  const foundItemIds = useMemo(
    () =>
      new Set(
        reports
          .filter((report) => report.type === "Found")
          .map((report) => report.id),
      ),
    [reports],
  );
  const foundItemClaims = useMemo(() => {
    const resolvedItemIds = new Set(
      allClaims
        .filter((claim) => RESOLVED_CLAIM_STATUSES.has(claim.status))
        .map((claim) => claim.itemId),
    );
    // Once one request is approved for an item, the other requests for
    // that item are resolved away — only show the approved one.
    return allClaims.filter(
      (claim) =>
        foundItemIds.has(claim.itemId) &&
        (!resolvedItemIds.has(claim.itemId) ||
          RESOLVED_CLAIM_STATUSES.has(claim.status)),
    );
  }, [allClaims, foundItemIds]);

  const handleClaimStatusChange = async (
    id: string,
    status: ClaimRequest["status"],
    reason?: string,
  ): Promise<void> => {
    const serverStatus = ADMIN_STATUS[status];
    if (!serverStatus) return;

    await updateClaimStatus.mutateAsync({ id, status: serverStatus, reason });
  };

  const handleOsaReceiptChange = (id: string, receivedByOsa: boolean) => {
    updateOsaReceipt.mutate(
      { id, receivedByOsa },
      {
        onSuccess: () => {
          toast.success(
            receivedByOsa
              ? "Item marked received by OSA."
              : "Item marked not yet received.",
          );
        },
        onError: () => {
          toast.error("Could not update the physical item status. Please try again.");
        },
      },
    );
  };

  const refetch = () => {
    void refetchClaims();
    void refetchItems();
  };

  return {
    allClaims,
    foundItemClaims,
    reports,
    isLoading: claimsLoading || itemsLoading,
    isError: claimsError || itemsError,
    refetch,
    handleClaimStatusChange,
    handleOsaReceiptChange,
    isUpdatingOsaReceipt: updateOsaReceipt.isPending,
  };
}

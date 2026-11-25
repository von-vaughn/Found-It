import { useMemo } from "react";
import toast from "react-hot-toast";
import type { ClaimRequest } from "@/types/claim";
import type { ServerClaimStatus } from "@/services/claimService";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { toClaimRequests } from "@/lib/claimAdapter";
import { useAdminClaims, useUpdateAdminClaimStatus } from "@/hooks/useClaims";
import {
  useItems,
  useRemindFinder,
  useUpdateOsaReceipt,
} from "@/hooks/useItems";

const ADMIN_STATUS: Partial<
  Record<ClaimRequest["status"], Exclude<ServerClaimStatus, "pending">>
> = {
  Approved: "approved",
  Rejected: "rejected",
  Claimed: "claimed",
  Returned: "returned",
};

const RESOLVED_CLAIM_STATUSES = new Set(["Claimed", "Returned"]);

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
  const remindFinderMutation = useRemindFinder();

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
    for (const report of reports) {
      if (report.status === "Claimed" || report.status === "Returned") {
        resolvedItemIds.add(report.id);
      }
    }
    // Exclude items that have already been claimed or returned; they remain visible on the Items page.
    return allClaims.filter(
      (claim) =>
        foundItemIds.has(claim.itemId) && !resolvedItemIds.has(claim.itemId),
    );
  }, [allClaims, foundItemIds, reports]);

  const handleClaimStatusChange = async (
    id: string,
    status: ClaimRequest["status"],
    reason?: string,
    instructions?: string,
  ): Promise<void> => {
    const serverStatus = ADMIN_STATUS[status];
    if (!serverStatus) return;

    await updateClaimStatus.mutateAsync({
      id,
      status: serverStatus,
      reason,
      instructions,
    });
  };

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
    handleRemindFinder,
    isRemindingFinder: remindFinderMutation.isPending,
  };
}

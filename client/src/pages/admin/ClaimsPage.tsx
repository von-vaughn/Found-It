import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ClaimRequest } from "@/types/claim";
import type { ServerClaimStatus } from "@/services/claimService";
import { ClaimsView } from "@/components/admin/ClaimsView";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { useAuditDecision } from "@/components/admin/useAuditDecision";
import { toClaimRequests } from "@/lib/claimAdapter";
import { useAdminClaims, useUpdateAdminClaimStatus } from "@/hooks/useClaims";
import toast from "react-hot-toast";
import { useItems, useUpdateOsaReceipt } from "@/hooks/useItems";
import { AdminLayout } from "./AdminLayout";

const ADMIN_STATUS: Partial<
  Record<ClaimRequest["status"], Exclude<ServerClaimStatus, "pending">>
> = {
  Approved: "approved",
  Rejected: "rejected",
  Claimed: "claimed",
  Returned: "returned",
};

export function ClaimsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [manualClaimId, setManualClaimId] = useState<string | null>(null);
  const logDecision = useAuditDecision();
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
  const RESOLVED_CLAIM_STATUSES = useMemo(
    () => new Set(["Approved", "Claimed", "Returned"]),
    [],
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
  }, [allClaims, foundItemIds, RESOLVED_CLAIM_STATUSES]);

  const claimIdFromUrl = searchParams.get("claimId");
  const urlClaimValid =
    claimIdFromUrl !== null &&
    foundItemClaims.some((claim) => claim.id === claimIdFromUrl);
  const manualClaimValid =
    manualClaimId !== null &&
    foundItemClaims.some((claim) => claim.id === manualClaimId);

  const selectedClaimId =
    (urlClaimValid ? claimIdFromUrl : null) ??
    (manualClaimValid ? manualClaimId : null) ??
    foundItemClaims[0]?.id ??
    "";

  const handleSelectClaim = (id: string) => {
    setManualClaimId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("claimId", id);
        return next;
      },
      { replace: true },
    );
  };

  const handleClaimStatusChange = async (
    id: string,
    status: ClaimRequest["status"],
  ): Promise<void> => {
    const serverStatus = ADMIN_STATUS[status];
    if (!serverStatus) return;
    const claim = allClaims.find((entry) => entry.id === id);
    const action =
      status === "Approved"
        ? "approved"
        : status === "Rejected"
          ? "rejected"
          : status === "Returned"
            ? "returned"
            : status === "Claimed"
              ? "claimed"
              : null;

    await updateClaimStatus.mutateAsync({ id, status: serverStatus });
    if (!action) return;
    logDecision({
      action,
      entityType: "claim",
      entityId: id,
      itemTitle: claim?.item ?? id,
      details: `${status} by super admin for claim ${id}${
        claim ? ` (${claim.claimant})` : ""
      }.`,
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

  if (claimsLoading || itemsLoading) {
    return (
      <AdminLayout
        activeSection="claims"
        showSearch
        query={query}
        onQueryChange={setQuery}
      >
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Loading claims…
        </p>
      </AdminLayout>
    );
  }

  if (claimsError || itemsError) {
    return (
      <AdminLayout
        activeSection="claims"
        showSearch
        query={query}
        onQueryChange={setQuery}
      >
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Could not load claims.
          </p>
          <button
            type="button"
            onClick={() => {
              void refetchClaims();
              void refetchItems();
            }}
            className="inline-flex h-9 items-center rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activeSection="claims"
      showSearch
      query={query}
      onQueryChange={setQuery}
    >
      <ClaimsView
        claims={foundItemClaims}
        reports={reports}
        query={query.trim().toLowerCase()}
        selectedClaimId={selectedClaimId}
        onSelectClaim={handleSelectClaim}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={[
          "All",
          "Pending",
          "Approved",
          "Claimed",
          "Rejected",
        ]}
        onClaimStatusChange={handleClaimStatusChange}
        onOsaReceiptChange={handleOsaReceiptChange}
        isUpdatingOsaReceipt={updateOsaReceipt.isPending}
        plainDetails
      />
    </AdminLayout>
  );
}

export default ClaimsPage;

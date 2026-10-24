import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { ClaimRequest } from "@/types/claim";
import type { ServerClaimStatus } from "@/services/claimService";
import type { RecordStatus } from "@/components/admin/types";
import { ClaimsView } from "@/components/admin/ClaimsView";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { useAuditDecision } from "@/components/admin/useAuditDecision";
import { toClaimRequests } from "@/lib/claimAdapter";
import { useAdminClaims, useUpdateAdminClaimStatus } from "@/hooks/useClaims";
import { useItems } from "@/hooks/useItems";
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
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [manualClaimId, setManualClaimId] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, RecordStatus>
  >({});
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

  const handleClaimStatusChange = (
    id: string,
    status: ClaimRequest["status"],
  ) => {
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

    updateClaimStatus.mutate(
      { id, status: serverStatus },
      {
        onSuccess: () => {
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
        },
        onError: () => {
          toast.error("Could not update this claim. Please try again.");
        },
      },
    );
  };

  const handleItemStatusChange = (itemId: string, status: RecordStatus) => {
    setItemStatuses((current) => ({ ...current, [itemId]: status }));
  };

  const selectedClaim = foundItemClaims.find(
    (claim) => claim.id === selectedClaimId,
  );

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

  if (!selectedClaim) {
    return (
      <AdminLayout
        activeSection="claims"
        showSearch
        query={query}
        onQueryChange={setQuery}
      >
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No claims found.
        </p>
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
        selectedClaim={selectedClaim}
        selectedClaimId={selectedClaimId}
        onSelectClaim={handleSelectClaim}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={["Pending", "Approved", "Claimed", "Rejected"]}
        onClaimStatusChange={handleClaimStatusChange}
        onItemStatusChange={handleItemStatusChange}
        itemStatusOverrides={itemStatuses}
        plainDetails
      />
    </AdminLayout>
  );
}

export default ClaimsPage;

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ClaimRequest } from "@/types/claim";
import type { RecordStatus } from "@/components/admin/types";
import { ClaimsView } from "@/components/admin/ClaimsView";
import { claims, itemToAdminReport } from "@/components/admin/adminData";
import type { Item } from "@/data/mockItems";
import { AdminLayout } from "./AdminLayout";

export function ClaimsPage({
  items,
  additionalClaims = [],
}: {
  items: Item[];
  additionalClaims?: ClaimRequest[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [manualClaimId, setManualClaimId] = useState<string | null>(null);
  const [claimStatuses, setClaimStatuses] = useState<
    Record<string, ClaimRequest["status"]>
  >({});
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, RecordStatus>
  >({});

  const allClaims = useMemo(
    () =>
      [...additionalClaims, ...claims].map((claim) =>
        {
          const status = claimStatuses[claim.id] ?? claim.status;
          return {
            ...claim,
            status: status === "Under review" ? "Pending" : status,
          };
        },
      ),
    [additionalClaims, claimStatuses],
  );
  const reports = useMemo(() => items.map(itemToAdminReport), [items]);
  const foundItemIds = useMemo(
    () =>
      new Set(
        reports
          .filter((report) => report.type === "Found")
          .map((report) => report.id),
      ),
    [reports],
  );
  const foundItemClaims = useMemo(
    () => allClaims.filter((claim) => foundItemIds.has(claim.itemId)),
    [allClaims, foundItemIds],
  );

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
    setClaimStatuses((current) => ({ ...current, [id]: status }));
  };

  const handleItemStatusChange = (itemId: string, status: RecordStatus) => {
    setItemStatuses((current) => ({ ...current, [itemId]: status }));
  };

  const selectedClaim = foundItemClaims.find(
    (claim) => claim.id === selectedClaimId,
  );

  if (!selectedClaim) {
    return (
      <AdminLayout
        activeSection="claims"
        showSearch
        query={query}
        onQueryChange={setQuery}
      >
        <p className="px-5 py-10 text-center text-sm text-neutral-500">
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
        onClaimStatusChange={handleClaimStatusChange}
        onItemStatusChange={handleItemStatusChange}
        itemStatusOverrides={itemStatuses}
      />
    </AdminLayout>
  );
}

export default ClaimsPage;

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ClaimRequest } from "@/types/claim";
import type { RecordStatus } from "@/components/admin/types";
import { ClaimsView } from "@/components/admin/ClaimsView";
import { claims, itemToAdminReport } from "@/components/admin/adminData";
import type { Item } from "@/data/mockItems";
import { SuperAdminLayout } from "./SuperAdminLayout";
import { useAuth } from "@/context/useAuth";
import {
  appendAuditLog,
  loadAuditLogs,
  type AuditAction,
} from "@/lib/auditLog";

export function SuperAdminClaimsPage({
  items,
  additionalClaims = [],
}: {
  items: Item[];
  additionalClaims?: ClaimRequest[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [manualClaimId, setManualClaimId] = useState<string | null>(null);
  const [claimStatuses, setClaimStatuses] = useState<
    Record<string, ClaimRequest["status"]>
  >({});
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, RecordStatus>
  >({});
  const { user } = useAuth();

  const allClaims = useMemo(
    () =>
      [...additionalClaims, ...claims].map((claim) => {
        const status = claimStatuses[claim.id] ?? claim.status;
        return {
          ...claim,
          status: status === "Under review" ? "Pending" : status,
        };
      }),
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

  const statusToAuditAction = (
    status: ClaimRequest["status"],
  ): AuditAction | null => {
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    if (status === "Returned") return "returned";
    if (status === "Claimed") return "claimed";
    return null;
  };

  const handleClaimStatusChange = (
    id: string,
    status: ClaimRequest["status"],
  ) => {
    setClaimStatuses((current) => ({ ...current, [id]: status }));
    const auditAction = statusToAuditAction(status);
    if (!auditAction) return;
    const claim = allClaims.find((c) => c.id === id);
    appendAuditLog(loadAuditLogs(), {
      adminId: user?.id ?? "superadmin-demo",
      adminName: user?.name ?? "System Owner",
      adminEmail: user?.email ?? "owner@wmsu.edu.ph",
      adminRole: "super_admin",
      action: auditAction,
      entityType: "claim",
      entityId: id,
      itemTitle: claim?.item ?? id,
      details: `${status} by super admin for claim ${id}${claim ? ` (${claim.claimant})` : ""}.`,
    });
  };

  const handleItemStatusChange = (itemId: string, status: RecordStatus) => {
    setItemStatuses((current) => ({ ...current, [itemId]: status }));
  };

  const selectedClaim = foundItemClaims.find(
    (claim) => claim.id === selectedClaimId,
  );

  if (!selectedClaim) {
    return (
      <SuperAdminLayout
        activeSection="claims"
        showSearch
        query={query}
        onQueryChange={setQuery}
      >
        <p className="px-5 py-10 text-center text-sm text-neutral-500">
          No claims found.
        </p>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
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
      />
    </SuperAdminLayout>
  );
}

export default SuperAdminClaimsPage;

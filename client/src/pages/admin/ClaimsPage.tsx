import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ClaimsListPanel } from "@/components/admin/ClaimsView";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useFoundClaimsWorkflow } from "./useFoundClaimsWorkflow";

export function ClaimsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { foundItemClaims, reports, isLoading, isError, refetch } =
    useFoundClaimsWorkflow();

  const claimIdFromUrl = searchParams.get("claimId");
  if (claimIdFromUrl) {
    return (
      <Navigate
        to={`${paths.adminClaims}/${encodeURIComponent(claimIdFromUrl)}`}
        replace
      />
    );
  }

  const handleSelectClaim = (id: string) => {
    navigate(`${paths.adminClaims}/${encodeURIComponent(id)}`);
  };

  if (isLoading) {
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

  if (isError) {
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
            onClick={refetch}
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
      <ClaimsListPanel
        claims={foundItemClaims}
        reports={reports}
        query={query.trim().toLowerCase()}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={[
          "All",
          "Pending",
          "Approved",
          "Claimed",
          "Rejected",
        ]}
        onSelectClaim={handleSelectClaim}
      />
    </AdminLayout>
  );
}

export default ClaimsPage;

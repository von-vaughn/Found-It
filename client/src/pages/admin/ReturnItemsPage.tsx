import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ReturnsListPanel } from "@/components/admin/ReturnsView";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useAdminReturnsWorkflow } from "./useAdminReturnsWorkflow";

export function ReturnItemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const { visibleRequests, reports, isLoading, isError, refetch } =
    useAdminReturnsWorkflow();

  const returnIdFromUrl = searchParams.get("returnId");
  if (returnIdFromUrl) {
    return (
      <Navigate
        to={`${paths.adminReturns}/${encodeURIComponent(returnIdFromUrl)}`}
        replace
      />
    );
  }

  const handleSelectReturn = (id: string) => {
    navigate(`${paths.adminReturns}/${encodeURIComponent(id)}`);
  };

  if (isLoading) {
    return (
      <AdminLayout
        activeSection="returns"
        showSearch
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search return requests…"
      >
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Loading return requests…
        </p>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout
        activeSection="returns"
        showSearch
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search return requests…"
      >
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Could not load return requests.
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
      activeSection="returns"
      showSearch
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="Search return requests…"
    >
      <ReturnsListPanel
        visibleRequests={visibleRequests}
        reports={reports}
        query={query}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSelectReturn={handleSelectReturn}
      />
    </AdminLayout>
  );
}

export default ReturnItemsPage;

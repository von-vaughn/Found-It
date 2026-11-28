import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { AdminQrScannerModal } from "@/components/admin/AdminQrScannerModal";
import { ClaimsListPanel } from "@/components/admin/ClaimsView";
import { Panel } from "@/components/admin/Panel";
import { ReturnsListPanel } from "@/components/admin/ReturnsView";
import { useIsMobileView } from "@/hooks/useIsMobileView";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useAdminReturnsWorkflow } from "./useAdminReturnsWorkflow";
import { useFoundClaimsWorkflow } from "./useFoundClaimsWorkflow";

type RequestsTab = "claims" | "returns";

export function ClaimsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const isMobileView = useIsMobileView();

  const activeTab: RequestsTab =
    searchParams.get("tab") === "returns" ? "returns" : "claims";

  const claimsWorkflow = useFoundClaimsWorkflow();
  const returnsWorkflow = useAdminReturnsWorkflow();

  const claimIdFromUrl = searchParams.get("claimId");
  if (claimIdFromUrl) {
    return (
      <Navigate
        to={`${paths.adminClaims}/${encodeURIComponent(claimIdFromUrl)}`}
        replace
      />
    );
  }

  const returnIdFromUrl = searchParams.get("returnId");
  if (returnIdFromUrl) {
    return (
      <Navigate
        to={`${paths.adminReturns}/${encodeURIComponent(returnIdFromUrl)}`}
        replace
      />
    );
  }

  const switchTab = (nextTab: RequestsTab) => {
    setQuery("");
    setSearchParams(nextTab === "returns" ? { tab: "returns" } : {}, {
      replace: true,
    });
  };

  const handleSelectClaim = (id: string) => {
    navigate(`${paths.adminClaims}/${encodeURIComponent(id)}`);
  };

  const handleSelectReturn = (id: string) => {
    navigate(`${paths.adminReturns}/${encodeURIComponent(id)}`);
  };

  const isLoading =
    activeTab === "claims"
      ? claimsWorkflow.isLoading
      : returnsWorkflow.isLoading;
  const isError =
    activeTab === "claims" ? claimsWorkflow.isError : returnsWorkflow.isError;
  const refetch =
    activeTab === "claims" ? claimsWorkflow.refetch : returnsWorkflow.refetch;

  const tabSwitcher = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
        role="tablist"
        aria-label="Claims and return requests"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "claims"}
          onClick={() => switchTab("claims")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
            activeTab === "claims"
              ? "bg-[#E5192D] text-white"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          }`}
        >
          <span>Claims</span>
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
              activeTab === "claims"
                ? "bg-white/20 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {claimsWorkflow.foundItemClaims.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "returns"}
          onClick={() => switchTab("returns")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
            activeTab === "returns"
              ? "bg-[#E5192D] text-white"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          }`}
        >
          <span>Returns</span>
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
              activeTab === "returns"
                ? "bg-white/20 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {returnsWorkflow.visibleRequests.length}
          </span>
        </button>
      </div>

      {!isMobileView && (
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <ScanLine
            className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          Scan QR
        </button>
      )}
    </div>
  );

  return (
    <AdminLayout
      activeSection="claims"
      showSearch
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={
        activeTab === "claims" ? "Search claims" : "Search returns"
      }
    >
      {tabSwitcher}

      {isLoading ? (
        <Panel
          title={activeTab === "claims" ? "Claim requests" : "Return requests"}
        >
          <div className="flex min-h-[280px] items-center justify-center px-6 py-12">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {activeTab === "claims"
                ? "Loading claims"
                : "Loading return requests"}
            </p>
          </div>
        </Panel>
      ) : isError ? (
        <Panel
          title={activeTab === "claims" ? "Claim requests" : "Return requests"}
        >
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {activeTab === "claims"
                ? "Could not load claims"
                : "Could not load return requests"}
            </p>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-4 text-xs font-medium text-white transition-colors hover:bg-[#c81526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              Retry
            </button>
          </div>
        </Panel>
      ) : activeTab === "claims" ? (
        <>
          <ClaimsListPanel
            claims={claimsWorkflow.foundItemClaims}
            reports={claimsWorkflow.reports}
            query={query.trim().toLowerCase()}
            onSelectClaim={handleSelectClaim}
          />
          <LoadMoreButton
            hasMore={claimsWorkflow.hasMore}
            isLoading={claimsWorkflow.isFetchingMore}
            onLoadMore={claimsWorkflow.fetchMore}
            label="Load more claims"
          />
        </>
      ) : (
        <>
          <ReturnsListPanel
            visibleRequests={returnsWorkflow.visibleRequests}
            reports={returnsWorkflow.reports}
            query={query}
            onSelectReturn={handleSelectReturn}
          />
          <LoadMoreButton
            hasMore={returnsWorkflow.hasMore}
            isLoading={returnsWorkflow.isFetchingMore}
            onLoadMore={returnsWorkflow.fetchMore}
            label="Load more returns"
          />
        </>
      )}
      {!isMobileView && (
        <AdminQrScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={(targetPath) => {
            setScannerOpen(false);
            navigate(targetPath);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default ClaimsPage;

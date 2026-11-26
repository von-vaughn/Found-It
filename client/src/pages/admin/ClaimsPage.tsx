import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { AdminQrScannerModal } from "@/components/admin/AdminQrScannerModal";
import { ClaimsListPanel } from "@/components/admin/ClaimsView";
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
    <FadeIn y={4}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-white p-1 dark:bg-neutral-900"
          role="tablist"
          aria-label="Claims and return requests"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "claims"}
            onClick={() => switchTab("claims")}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
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
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
              activeTab === "returns"
                ? "bg-[#E5192D] text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            }`}
          >
            <span>Return</span>
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
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <ScanLine className="h-4 w-4 text-[#E5192D]" aria-hidden="true" />
            Scan QR
          </button>
        )}
      </div>
    </FadeIn>
  );

  return (
    <AdminLayout
      activeSection="claims"
      showSearch
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={
        activeTab === "claims"
          ? "Search claim requests…"
          : "Search return requests…"
      }
    >
      {tabSwitcher}

      {isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {activeTab === "claims"
            ? "Loading claims…"
            : "Loading return requests…"}
        </p>
      ) : isError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {activeTab === "claims"
              ? "Could not load claims."
              : "Could not load return requests."}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex h-9 items-center rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Retry
          </button>
        </div>
      ) : activeTab === "claims" ? (
        <ClaimsListPanel
          claims={claimsWorkflow.foundItemClaims}
          reports={claimsWorkflow.reports}
          query={query.trim().toLowerCase()}
          onSelectClaim={handleSelectClaim}
        />
      ) : (
        <ReturnsListPanel
          visibleRequests={returnsWorkflow.visibleRequests}
          reports={returnsWorkflow.reports}
          query={query}
          onSelectReturn={handleSelectReturn}
        />
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

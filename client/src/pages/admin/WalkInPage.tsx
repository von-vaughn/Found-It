import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { FadeIn } from "@/components/FadeIn";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { NoItemImage } from "@/components/NoItemImage";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { Panel } from "@/components/admin/Panel";
import { OsaReceiptConfirmModal } from "@/components/admin/OsaReceiptConfirmModal";
import { OsaReceiptStatus } from "@/components/admin/OsaReceiptStatus";
import { WalkInClaimModal } from "@/components/admin/WalkInClaimModal";
import { WalkInReturnModal } from "@/components/admin/WalkInReturnModal";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { useSelectedReport } from "@/components/admin/useSelectedReport";
import type { AdminReport } from "@/components/admin/types";
import { useAdminClaims } from "@/hooks/useClaims";
import { useInfiniteItems, useUpdateOsaReceipt } from "@/hooks/useItems";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

type WalkInTab = "claims" | "returns";

export function WalkInPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: WalkInTab =
    searchParams.get("tab") === "returns" ? "returns" : "claims";

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [osaOnlyFilter, setOsaOnlyFilter] = useState<"all" | "received" | "pending">(
    () => {
      const raw = searchParams.get("osa");
      return raw === "received" || raw === "pending" ? raw : "all";
    },
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query) next.set("q", query);
    else next.delete("q");
    if (activeTab === "claims" && osaOnlyFilter !== "all") {
      next.set("osa", osaOnlyFilter);
    } else {
      next.delete("osa");
    }
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  }, [activeTab, osaOnlyFilter, query, searchParams, setSearchParams]);
  const [claimTarget, setClaimTarget] = useState<AdminReport | null>(null);
  const [returnTarget, setReturnTarget] = useState<AdminReport | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<AdminReport | null>(null);
  const { selectedReport, setSelectedReport, dialogRef } = useSelectedReport();

  const {
    items,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteItems(undefined, 50);

  const updateOsaReceipt = useUpdateOsaReceipt();
  const { data: adminClaims = [] } = useAdminClaims();

  const pendingClaimsByItemId = useMemo(() => {
    const map = new Map<string, { count: number; firstClaimId: string }>();
    for (const claim of adminClaims) {
      if (claim.status !== "pending") continue;
      const existing = map.get(claim.itemId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(claim.itemId, { count: 1, firstClaimId: claim.id });
      }
    }
    return map;
  }, [adminClaims]);

  const reports = useMemo(() => items.map(serverItemToAdminReport), [items]);

  const activeFoundReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.type === "Found" &&
          report.status !== "Claimed" &&
          report.status !== "Returned",
      ),
    [reports],
  );

  const activeLostReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.type === "Lost" &&
          report.status !== "Claimed" &&
          report.status !== "Returned",
      ),
    [reports],
  );

  const filteredList = useMemo(() => {
    const source = activeTab === "claims" ? activeFoundReports : activeLostReports;
    const trimmed = query.trim().toLowerCase();

    return source.filter((report) => {
      if (activeTab === "claims") {
        if (osaOnlyFilter === "received" && !report.receivedByOsa) return false;
        if (osaOnlyFilter === "pending" && report.receivedByOsa) return false;
      }
      if (!trimmed) return true;
      return report.title.toLowerCase().includes(trimmed);
    });
  }, [activeTab, activeFoundReports, activeLostReports, osaOnlyFilter, query]);

  const handleTabChange = (nextTab: WalkInTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "returns") {
      next.set("tab", "returns");
      next.delete("osa");
    } else {
      next.delete("tab");
    }
    setSearchParams(next, { replace: true });
  };

  const handleOsaReceiptChange = (id: string, receivedByOsa: boolean) => {
    updateOsaReceipt.mutate(
      { id, receivedByOsa },
      {
        onSuccess: (updatedItem) => {
          setSelectedReport((current) =>
            current?.id === updatedItem.id
              ? { ...current, receivedByOsa: updatedItem.receivedByOsa ?? false }
              : current,
          );
          toast.success(
            receivedByOsa
              ? "Item marked received by OSA."
              : "Item marked not yet received.",
          );
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          toast.error(msg || "Could not update OSA receipt status.");
        },
      },
    );
  };

  const handleConfirmMarkReceived = () => {
    if (!receiveTarget) return;
    const target = receiveTarget;
    const nextReceived = !target.receivedByOsa;
    updateOsaReceipt.mutate(
      { id: target.id, receivedByOsa: nextReceived },
      {
        onSuccess: (updatedItem) => {
          setSelectedReport((current) =>
            current?.id === updatedItem.id
              ? { ...current, receivedByOsa: updatedItem.receivedByOsa ?? false }
              : current,
          );
          toast.success(
            nextReceived
              ? `"${target.title}" marked as received by OSA.`
              : `"${target.title}" marked as not yet received by OSA.`,
          );
          setReceiveTarget(null);
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          toast.error(msg || "Could not update OSA receipt status.");
          setReceiveTarget(null);
        },
      },
    );
  };

  return (
    <AdminLayout
      activeSection="walkin"
      showSearch
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={
        activeTab === "claims" ? "Search found items" : "Search lost items"
      }
    >
      <div className="space-y-4">
        {/* Tab switcher and OSA filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Walk-in transaction type"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "claims"}
              onClick={() => handleTabChange("claims")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                activeTab === "claims"
                  ? "bg-[#E5192D] text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              }`}
            >
              <span>Walk-in claims</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                  activeTab === "claims"
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {activeFoundReports.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "returns"}
              onClick={() => handleTabChange("returns")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                activeTab === "returns"
                  ? "bg-[#E5192D] text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              }`}
            >
              <span>Walk-in returns</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                  activeTab === "returns"
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {activeLostReports.length}
              </span>
            </button>
          </div>

          {activeTab === "claims" && (
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "received", label: "Received" },
                  { id: "pending", label: "Not yet received" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setOsaOnlyFilter(chip.id)}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                    osaOnlyFilter === chip.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <FadeIn key={activeTab} y={6} duration={0.25}>
          <Panel
            title={activeTab === "claims" ? "Found items" : "Lost items"}
            action={
              <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {filteredList.length}{" "}
                {filteredList.length === 1 ? "item" : "items"}
              </span>
            }
          >
            {isLoading ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-12">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading items
                </p>
              </div>
            ) : isError ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Could not load items
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-4 text-xs font-medium text-white transition-colors hover:bg-[#c81526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
                >
                  Retry
                </button>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {activeTab === "claims"
                    ? "No found items available for walk-in claim"
                    : "No lost items available for walk-in return"}
                </p>
                <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                  {activeTab === "claims"
                    ? "Found items must be received by OSA before a walk-in claim can be recorded"
                    : "When a finder brings an item matching a Lost post to the OSA desk, record it here"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredList.map((report) => {
                  const pendingClaimInfo =
                    activeTab === "claims"
                      ? pendingClaimsByItemId.get(report.id)
                      : undefined;
                  const hasPendingClaims = Boolean(pendingClaimInfo);

                  return (
                    <div
                      key={report.id}
                      className="flex flex-col gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-neutral-800/40"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                          {report.image ? (
                            <img
                              src={report.image}
                              alt={report.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <NoItemImage compact className="h-full w-full" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                              {report.title}
                            </h3>
                            {activeTab === "claims" && (
                              <OsaReceiptStatus received={report.receivedByOsa} />
                            )}
                          </div>

                          {pendingClaimInfo && (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                              <AlertTriangle
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                              <span>
                                {pendingClaimInfo.count} pending claim{" "}
                                {pendingClaimInfo.count === 1
                                  ? "request"
                                  : "requests"}{" "}
                                — review and reject before recording a walk-in
                                claim
                              </span>
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {activeTab === "claims" ? (
                          <>
                            {pendingClaimInfo && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `${paths.adminClaims}/${encodeURIComponent(pendingClaimInfo.firstClaimId)}`,
                                  )
                                }
                                className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                              >
                                Review pending
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={updateOsaReceipt.isPending}
                              onClick={() => setReceiveTarget(report)}
                              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            >
                              {report.receivedByOsa
                                ? "Mark not yet received"
                                : "Mark received"}
                            </button>
                            <button
                              type="button"
                              disabled={!report.receivedByOsa || hasPendingClaims}
                              title={
                                hasPendingClaims
                                  ? "Review and reject all pending claim requests on this item before recording a walk-in claim"
                                  : !report.receivedByOsa
                                    ? "Mark the item as received by OSA before recording a walk-in claim"
                                    : "Record a walk-in claim at the OSA desk"
                              }
                              onClick={() => setClaimTarget(report)}
                              className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#c81526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-offset-neutral-900"
                            >
                              Walk-in claim
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReturnTarget(report)}
                            className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#c81526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
                          >
                            Walk-in return
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasNextPage && (
              <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <LoadMoreButton
                  hasMore={Boolean(hasNextPage)}
                  isLoading={isFetchingNextPage}
                  onLoadMore={() => {
                    void fetchNextPage();
                  }}
                />
              </div>
            )}
          </Panel>
        </FadeIn>
      </div>

      {claimTarget && (
        <WalkInClaimModal
          open
          itemId={claimTarget.id}
          itemTitle={claimTarget.title}
          onClose={() => setClaimTarget(null)}
          onSuccess={() => setClaimTarget(null)}
        />
      )}

      {returnTarget && (
        <WalkInReturnModal
          open
          itemId={returnTarget.id}
          itemTitle={returnTarget.title}
          onClose={() => setReturnTarget(null)}
          onSuccess={() => setReturnTarget(null)}
        />
      )}

      <OsaReceiptConfirmModal
        open={Boolean(receiveTarget)}
        itemName={receiveTarget?.title ?? ""}
        nextReceived={!receiveTarget?.receivedByOsa}
        context="item"
        isUpdating={updateOsaReceipt.isPending}
        onCancel={() => setReceiveTarget(null)}
        onConfirm={handleConfirmMarkReceived}
      />

      {selectedReport && (
        <ItemDetailsDialog
          key={selectedReport.id}
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
          onOsaReceiptChange={handleOsaReceiptChange}
          isUpdatingOsaReceipt={updateOsaReceipt.isPending}
        />
      )}
    </AdminLayout>
  );
}

export default WalkInPage;

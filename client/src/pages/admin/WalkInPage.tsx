import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  HandHelping,
  MapPin,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { FadeIn } from "@/components/FadeIn";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { NoItemImage } from "@/components/NoItemImage";
import { Panel } from "@/components/admin/Panel";
import { OsaReceiptConfirmModal } from "@/components/admin/OsaReceiptConfirmModal";
import { OsaReceiptStatus } from "@/components/admin/OsaReceiptStatus";
import { WalkInClaimModal } from "@/components/admin/WalkInClaimModal";
import { WalkInReturnModal } from "@/components/admin/WalkInReturnModal";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import type { AdminReport } from "@/components/admin/types";
import { useInfiniteItems, useUpdateOsaReceipt } from "@/hooks/useItems";
import { AdminLayout } from "./AdminLayout";

type WalkInTab = "claims" | "returns";

export function WalkInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: WalkInTab =
    searchParams.get("tab") === "returns" ? "returns" : "claims";

  const [query, setQuery] = useState("");
  const [osaOnlyFilter, setOsaOnlyFilter] = useState<"all" | "received" | "pending">("all");
  const [claimTarget, setClaimTarget] = useState<AdminReport | null>(null);
  const [returnTarget, setReturnTarget] = useState<AdminReport | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<AdminReport | null>(null);

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

  const handleTabChange = (next: WalkInTab) => {
    if (next === "returns") {
      setSearchParams({ tab: "returns" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleConfirmMarkReceived = () => {
    if (!receiveTarget) return;
    const target = receiveTarget;
    const nextReceived = !target.receivedByOsa;
    updateOsaReceipt.mutate(
      { id: target.id, receivedByOsa: nextReceived },
      {
        onSuccess: () => {
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
        activeTab === "claims"
          ? "Search found items by name…"
          : "Search lost items by name…"
      }
    >
      <FadeIn delay={0.05}>
        <div className="space-y-4">
          {/* Tab switcher */}
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
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                  activeTab === "claims"
                    ? "bg-[#E5192D] text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                }`}
              >
                <HandHelping className="h-3.5 w-3.5" aria-hidden="true" />
                Walk-In Claims
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
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                  activeTab === "returns"
                    ? "bg-[#E5192D] text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Walk-In Returns
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
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "All Found" },
                    { id: "received", label: "Received" },
                    { id: "pending", label: "Not Yet Received" },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setOsaOnlyFilter(chip.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                      osaOnlyFilter === chip.id
                        ? "bg-[#E5192D] text-white"
                        : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Panel
            title={
              activeTab === "claims"
                ? "Eligible Found Items for Walk-In Claim"
                : "Active Lost Items for Walk-In Return"
            }
            action={
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {filteredList.length}{" "}
                {filteredList.length === 1 ? "item" : "items"}
              </span>
            }
          >
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center px-5 py-10">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading items…
                </p>
              </div>
            ) : isError ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Could not load items.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg bg-[#E5192D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Retry
                </button>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-10 text-center">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {activeTab === "claims"
                    ? "No matching found items available for walk-in claim."
                    : "No matching lost items available for walk-in return."}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {activeTab === "claims"
                    ? "Found items must be received by OSA before a walk-in claim can be recorded."
                    : "When a finder brings an item matching a Lost post to the OSA desk, record it here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredList.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-neutral-800/40"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                        {report.image ? (
                          <img
                            src={report.image}
                            alt={report.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <NoItemImage className="h-full w-full" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {report.title}
                          </h3>
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {report.category}
                          </span>
                          {activeTab === "claims" && (
                            <OsaReceiptStatus received={report.receivedByOsa} />
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {(report.building || report.specificLocation) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                              />
                              {[report.building, report.specificLocation]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          <span>
                            {activeTab === "claims" ? "Finder:" : "Owner:"}{" "}
                            <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                              {report.reportedBy}
                            </strong>
                          </span>
                          <span>{report.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {activeTab === "claims" ? (
                        <>
                          <button
                            type="button"
                            disabled={updateOsaReceipt.isPending}
                            onClick={() => setReceiveTarget(report)}
                            className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              report.receivedByOsa
                                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                            }`}
                          >
                            {report.receivedByOsa
                              ? "Mark not yet received"
                              : "Mark received"}
                          </button>
                          <button
                            type="button"
                            disabled={!report.receivedByOsa}
                            title={
                              !report.receivedByOsa
                                ? "Mark the item as received by OSA before recording a walk-in claim."
                                : "Record a walk-in claim at the OSA desk"
                            }
                            onClick={() => setClaimTarget(report)}
                            className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Walk-in claim
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReturnTarget(report)}
                          className="inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424]"
                        >
                          Walk-in return
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
        </div>
      </FadeIn>

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
    </AdminLayout>
  );
}

export default WalkInPage;

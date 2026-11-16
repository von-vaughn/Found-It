import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  MapPin,
  Palette,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  RequestEditDialog,
  type EditableRequestPayload,
} from "@/components/school_user/RequestEditDialog";
import {
  CLAIM_STATUS_TABS,
  simplifiedClaimStatusStyles,
  submissionStatusLabel,
  type StatusFilter,
} from "@/components/school_user/claimStatus";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import { useItems, useMyItems } from "@/hooks/useItems";
import { useDeleteClaim, useUpdateClaim } from "@/hooks/useClaims";
import {
  useDeleteReturnRequest,
  useUpdateReturnRequest,
} from "@/hooks/useReturns";
import { toClientItems } from "@/lib/itemAdapter";
import { toReturnedFoundReportClaim } from "@/lib/claimAdapter";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type { ClaimRequest } from "@/types/claim";

interface MyClaimsPageProps {
  submittedClaims?: ClaimRequest[];
  foundReports?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const MyClaimsPage: React.FC<MyClaimsPageProps> = ({
  submittedClaims = [],
  foundReports = [],
  filters,
  onFiltersChange,
}) => {
  const navigate = useNavigate();
  const { data: serverItems } = useItems(undefined, {
    staleTime: 30_000,
    retry: 1,
  });
  const { data: serverMyItems = [] } = useMyItems({
    staleTime: 30_000,
    retry: 1,
  });
  const items = useMemo(
    () =>
      serverItems
        ? toClientItems([
            ...serverItems,
            ...serverMyItems.filter(
              (mine) => !serverItems.some((item) => item.id === mine.id),
            ),
          ])
        : EMPTY_ITEMS,
    [serverItems, serverMyItems],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
  const [editingRequest, setEditingRequest] = useState<ClaimRequest | null>(
    null,
  );
  const [deletingRequest, setDeletingRequest] = useState<ClaimRequest | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const updateClaim = useUpdateClaim();
  const deleteClaim = useDeleteClaim();
  const updateReturnRequest = useUpdateReturnRequest();
  const deleteReturnRequest = useDeleteReturnRequest();

  const myClaims = useMemo(
    () => [
      ...submittedClaims,
      ...foundReports,
      ...serverMyItems
        .map(toReturnedFoundReportClaim)
        .filter((claim): claim is ClaimRequest => claim !== null),
    ],
    [submittedClaims, foundReports, serverMyItems],
  );

  const counts = useMemo(() => {
    const byStatus: Record<StatusFilter, number> = {
      Pending: 0,
      Approved: 0,
      Claimed: 0,
      Returned: 0,
      Rejected: 0,
    };
    for (const claim of myClaims) {
      byStatus[submissionStatusLabel(claim)] += 1;
    }
    return byStatus;
  }, [myClaims]);

  const filteredClaims = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return myClaims.filter((claim) => {
      if (submissionStatusLabel(claim) !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const item = items.find((entry) => entry.id === claim.itemId);
      return [
        claim.item,
        claim.claimantTitle ?? "",
        claim.color ?? "",
        claim.building ?? "",
        claim.location,
        claim.details,
        item?.title ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [myClaims, statusFilter, searchQuery, items]);

  const groupedByPost = useMemo(() => {
    const groups = new Map<string, ClaimRequest[]>();
    for (const claim of filteredClaims) {
      const list = groups.get(claim.itemId) ?? [];
      list.push(claim);
      groups.set(claim.itemId, list);
    }
    return [...groups.entries()];
  }, [filteredClaims]);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const isSubmittingChange =
    updateClaim.isPending ||
    deleteClaim.isPending ||
    updateReturnRequest.isPending ||
    deleteReturnRequest.isPending;

  const handleSaveRequest = async (payload: EditableRequestPayload) => {
    if (!editingRequest || editingRequest.status !== "Pending") return;

    if (editingRequest.kind === "return") {
      await updateReturnRequest.mutateAsync({ id: editingRequest.id, payload });
      toast.success("Found report updated.");
    } else {
      await updateClaim.mutateAsync({ id: editingRequest.id, payload });
      toast.success("Claim request updated.");
    }
    setEditingRequest(null);
  };

  const isDeletingRequest =
    deleteClaim.isPending || deleteReturnRequest.isPending;

  useEffect(() => {
    if (!deletingRequest) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingRequest) {
        setDeletingRequest(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deletingRequest, isDeletingRequest]);

  const handleConfirmDelete = async () => {
    if (
      !deletingRequest ||
      deletingRequest.status !== "Pending" ||
      isSubmittingChange
    ) {
      return;
    }

    const label =
      deletingRequest.kind === "return" ? "found report" : "claim request";

    try {
      if (deletingRequest.kind === "return") {
        await deleteReturnRequest.mutateAsync(deletingRequest.id);
      } else {
        await deleteClaim.mutateAsync(deletingRequest.id);
      }
      setDeletingRequest(null);
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted.`);
    } catch (error) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(message ?? `We couldn't delete this ${label}.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950 font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <Sidebar
        activeTab="claims"
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div
        className="sidebar-shift ml-0 flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:pb-0 md:ml-20 transition-[margin] duration-300"
      >
        <div className="hidden md:block">
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            activeFilterCount={countActiveFilters(filters)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={() => onFiltersChange(defaultFilters)}
            filterResultCount={applyAdvancedFilters(items, filters).length}
          />
        </div>

        <main className="mx-auto w-full max-w-[1440px] flex-1 bg-white dark:bg-neutral-950 px-4 pt-2 pb-8 sm:px-8 lg:px-12">
          <div className="notifications-shift min-w-0 w-full transition-[margin,width] duration-300 ease-in-out">
            <h1 className="sr-only">Claims &amp; Returned</h1>

            <div>
            <nav
              aria-label="Filter requests by status"
              className="flex flex-wrap items-center gap-2"
            >
              {CLAIM_STATUS_TABS.map((tab) => {
                const count = counts[tab.id];
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                      isActive
                        ? "border-[#E5192D] bg-[#E5192D] text-white"
                        : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="font-mono tabular-nums opacity-80">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {groupedByPost.length > 0 ? (
              <>
                {statusFilter === "Approved" &&
                  filteredClaims.some((claim) => claim.kind !== "return") && (
                  <div
                    role="status"
                    className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    <ClipboardList
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-sm leading-relaxed">
                      Claim approved — visit OSA to pick up your item.
                    </p>
                  </div>
                )}
                <StaggerGrid
                  key={statusFilter}
                  className="mt-6 space-y-6"
                >
                  {groupedByPost.map(([itemId, claims]) => {
                    const item = itemById.get(itemId);
                    const hasReturnedItem = claims.some(
                      (claim) =>
                        claim.kind === "return" && claim.status === "Returned",
                    );
                    return (
                      <StaggerItem key={itemId}>
                    {hasReturnedItem && (
                      <p
                        role="status"
                        className="mb-2 rounded-xl bg-teal-50 px-3.5 py-3 text-sm font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-200"
                      >
                        This item has already been returned.
                      </p>
                    )}
                    <section
                      aria-label={`Requests for ${claims[0]?.item ?? "post"}`}
                      className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {claims.map((claim) => {
                          const isFoundReport = claim.kind === "return";
                          const isPending = claim.status === "Pending";
                          const claimStatusLabel = submissionStatusLabel(claim);
                          const claimStatusStyle =
                            simplifiedClaimStatusStyles[claimStatusLabel];
                          const detailImages = (claim.evidence ?? []).filter(
                            (src) => src !== item?.image,
                          );
                          return (
                            <li key={claim.id} className="p-4 sm:p-5">
                              <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
                                <PhotoCarousel
                                  key={claim.id}
                                  photos={[
                                    ...(item?.image
                                      ? [
                                          {
                                            src: item.image,
                                            alt: item.title ?? claim.item,
                                          },
                                        ]
                                      : []),
                                    ...detailImages.map((src, photoIdx) => ({
                                      src,
                                      alt: `Evidence ${photoIdx + 1} for request ${claim.id}`,
                                    })),
                                  ]}
                                  emptySubtitle="The claimant did not attach any photos to this request."
                                />
                                <div className="flex min-w-0 flex-col">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <span className="font-semibold uppercase tracking-wider">
                                          {isFoundReport
                                            ? "Return Request"
                                            : "Claim Request"}
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-medium text-neutral-500 dark:text-neutral-400">
                                          Submitted{" "}
                                          <span className="font-mono tabular-nums">
                                            {claim.submitted}
                                          </span>
                                        </span>
                                      </p>
                                      <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                                        {item?.title ?? claim.item ?? "Post"}
                                      </h2>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span
                                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold ${claimStatusStyle}`}
                                      >
                                        {claimStatusLabel}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <h4 className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                                      Description
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                                      {claim.details}
                                    </p>
                                  </div>

                                  <dl className="mt-4 grid grid-cols-2 gap-px border-y border-neutral-200/80 bg-neutral-200/80 text-xs sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
                                    <div className="bg-white px-3 py-3 dark:bg-neutral-900">
                                      <dt className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <Palette
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Primary color
                                      </dt>
                                      <dd className="mt-1 font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                                        {claim.color?.trim() || "Not provided"}
                                      </dd>
                                    </div>
                                    <div className="bg-white px-3 py-3 dark:bg-neutral-900">
                                      <dt className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <MapPin
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Location {isFoundReport ? "found" : "lost"}
                                      </dt>
                                      <dd className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                                        {claim.location}
                                      </dd>
                                    </div>
                                    <div className="bg-white px-3 py-3 dark:bg-neutral-900">
                                      <dt className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <Building2
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Building
                                      </dt>
                                      <dd className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                                        {claim.building?.trim() || "Not provided"}
                                      </dd>
                                    </div>
                                    <div className="bg-white px-3 py-3 dark:bg-neutral-900">
                                      <dt className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <CalendarDays
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Date {isFoundReport ? "found" : "lost"}
                                      </dt>
                                      <dd className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                                        {claim.dateLost}
                                      </dd>
                                    </div>
                                    <div className="bg-white px-3 py-3 dark:bg-neutral-900">
                                      <dt className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <Clock3
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Time {isFoundReport ? "found" : "lost"}
                                      </dt>
                                      <dd className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                                        {claim.timeLost}
                                      </dd>
                                    </div>
                                    <div
                                      aria-hidden="true"
                                      className="bg-white dark:bg-neutral-900"
                                    />
                                  </dl>

                                  {claim.importantDetails?.trim() && (
                                    <div className="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                                      <h4 className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                                        Important Details
                                      </h4>
                                      <p className="mt-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                                        {claim.importantDetails}
                                      </p>
                                    </div>
                                  )}

                                  <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-5">
                                    {isPending && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setEditingRequest(claim)}
                                          disabled={isSubmittingChange}
                                          aria-label="Edit request"
                                          title="Edit request"
                                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                        >
                                          <Pencil
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingRequest(claim)}
                                          disabled={isSubmittingChange}
                                          aria-label="Delete request"
                                          title="Delete request"
                                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-900/60 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                        >
                                          <Trash2
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(`/dashboard/items/${itemId}`, {
                                          state: { from: "/dashboard/claims" },
                                        })
                                      }
                                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#E5192D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                                    >
                                      View post
                                      <ArrowRight
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                      </StaggerItem>
                    );
                  })}
                </StaggerGrid>
              </>
            ) : (
              <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
                  {searchQuery || myClaims.length > 0 ? (
                    <SearchX
                      className="h-8 w-8 stroke-[1.5]"
                      aria-hidden="true"
                    />
                  ) : (
                    <ClipboardList
                      className="h-8 w-8 stroke-[1.5]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {searchQuery.trim()
                    ? "No matching requests"
                    : myClaims.length === 0
                      ? "No claims or returned items yet"
                      : `No ${statusFilter.toLowerCase()} requests`}
                </h2>
                {!searchQuery.trim() && myClaims.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5192D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                  >
                    Browse items
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      <RequestEditDialog
        request={editingRequest}
        isSaving={updateClaim.isPending || updateReturnRequest.isPending}
        onClose={() => setEditingRequest(null)}
        onSave={handleSaveRequest}
      />

      {deletingRequest &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeletingRequest) {
                setDeletingRequest(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-claim-title"
              aria-describedby="delete-claim-description"
              className="relative w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2
                id="delete-claim-title"
                className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                Delete this{" "}
                {deletingRequest.kind === "return"
                  ? "found report"
                  : "claim request"}
                ?
              </h2>
              <p
                id="delete-claim-description"
                className="mt-2 break-words text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
              >
                Are you sure you want to delete your{" "}
                {deletingRequest.kind === "return"
                  ? "found report"
                  : "claim request"}{" "}
                for &ldquo;{deletingRequest.item}&rdquo;? This action cannot be
                undone.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingRequest}
                  onClick={() => setDeletingRequest(null)}
                  className="h-10 cursor-pointer rounded-xl border border-neutral-200 px-4 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingRequest}
                  onClick={() => void handleConfirmDelete()}
                  className="h-10 cursor-pointer rounded-xl bg-[#E5192D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingRequest ? "Deleting…" : "Confirm"}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MyClaimsPage;

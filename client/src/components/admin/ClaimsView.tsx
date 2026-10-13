import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 10;
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Palette,
  Tag,
  X,
} from "lucide-react";
import { Panel } from "./Panel";
import { NoItemImage } from "./NoItemImage";
import { StatusBadge } from "./StatusBadge";
import { StatusFilter } from "./StatusFilter";
import type { AdminReport, RecordStatus } from "./types";
import type { ClaimRequest } from "@/types/claim";
import { getClaimantEmail } from "@/types/claim";

function formatEventDate(value: string | undefined): string {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "None";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function formatEventTime(value: string | undefined): string {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "None";
  return new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(date);
}

type StatusDecision = "Approved" | "Returned" | "ItemClaimed" | "Rejected";

function ClaimRequestSection({
  claim,
  headingId,
  title,
  itemType,
  itemClaimed,
  onRequestStatus,
}: {
  claim: ClaimRequest;
  headingId: string;
  title?: string;
  itemType: "Lost" | "Found" | undefined;
  itemClaimed: boolean;
  onRequestStatus: (claimId: string, status: StatusDecision) => void;
}) {
  const isLostItem = itemType === "Lost";
  return (
    <section
      {...(title
        ? { "aria-labelledby": headingId }
        : { "aria-label": `${claim.claimant}'s request` })}
      className="border-t border-neutral-100 dark:border-neutral-800 pt-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && (
          <h2 id={headingId} className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        )}
        <span className={title ? "" : "ml-auto"}>
          <StatusBadge status={claim.status} />
        </span>
      </div>
      <div className="mt-3 grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          {claim.evidence && claim.evidence.length > 0 ? (
            <div
              className={`mt-2 grid gap-2 ${
                claim.evidence.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {claim.evidence.map((image, index) => (
                <div
                  key={`${claim.id}-evidence-${index}`}
                  className={`flex ${
                    (claim.evidence?.length ?? 0) > 1 ? "h-48" : "h-72"
                  } w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800`}
                >
                  <img
                    src={image}
                    alt={`Photo evidence ${index + 1} submitted by ${claim.claimant}`}
                    loading="lazy"
                    className="h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            <NoItemImage
              title="No photo evidence provided"
              subtitle="The claimant did not attach any photos to this request."
              className="mt-2 h-72"
            />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={
                claim.status === "Returned" ||
                claim.status === "Claimed" ||
                claim.status === "Rejected" ||
                (!isLostItem && itemClaimed)
              }
              onClick={() =>
                onRequestStatus(
                  claim.id,
                  !isLostItem && claim.status === "Approved"
                    ? "ItemClaimed"
                    : isLostItem
                      ? "Returned"
                      : "Approved",
                )
              }
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default ${
                claim.status === "Approved" ||
                (isLostItem && claim.status !== "Returned")
                  ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700 disabled:bg-emerald-700"
                  : "bg-[#E5192D] hover:bg-red-700 focus-visible:ring-[#E5192D] disabled:bg-emerald-700"
              }`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {claim.status === "Returned"
                ? "Returned"
                : claim.status === "Rejected"
                  ? "Rejected"
                  : claim.status === "Claimed" ||
                      (claim.status === "Approved" && !isLostItem)
                    ? "Claimed"
                    : isLostItem
                    ? "Mark as returned"
                    : "Approve request"}
            </button>
            <button
              type="button"
              disabled={claim.status !== "Pending"}
              onClick={() => onRequestStatus(claim.id, "Rejected")}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default ${
                claim.status === "Pending"
                  ? "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500"
              }`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reject
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {claim.claimant}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {getClaimantEmail(claim)}
          </p>
          <div className="mt-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
              {claim.details}
            </p>
          </div>
          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              Submitted
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.submitted}
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {itemType === "Lost" ? "Date found" : "Date lost"}
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.dateLost}
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {itemType === "Lost" ? "Time found" : "Time lost"}
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.timeLost}
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Location lost
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.location}
            </dd>
          </div>
        </dl>
        </div>
      </div>
    </section>
  );
}

export function ClaimsView({
  claims: claimRequests,
  reports,
  onClaimStatusChange,
  onItemStatusChange,
  itemStatusOverrides,
  query,
  selectedClaim,
  selectedClaimId,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
}: {
  claims: ClaimRequest[];
  reports: AdminReport[];
  onClaimStatusChange: (id: string, status: ClaimRequest["status"]) => void;
  onItemStatusChange: (itemId: string, status: RecordStatus) => void;
  itemStatusOverrides: Record<string, RecordStatus>;
  query: string;
  selectedClaim: ClaimRequest;
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions?: string[];
}) {
  const [page, setPage] = useState(1);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    claimId: string;
    status: StatusDecision;
  } | null>(null);
  const approvalDialogRef = useRef<HTMLDialogElement>(null);
  const claimForStatusChange = claimRequests.find(
    (claim) => claim.id === pendingStatusChange?.claimId,
  );

  useEffect(() => {
    const dialog = approvalDialogRef.current;
    if (!dialog) return;

    if (pendingStatusChange && !dialog.open) {
      dialog.showModal();
    } else if (!pendingStatusChange && dialog.open) {
      dialog.close();
    }
  }, [pendingStatusChange]);

  const filteredClaims = claimRequests.filter(
    (claim) =>
      (statusFilter === "All statuses" || claim.status === statusFilter) &&
      [claim.id, claim.item, claim.claimant, claim.location]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );

  // Reset to the first page whenever the list inputs change (derived state).
  const [prevListKey, setPrevListKey] = useState({
    query: "",
    statusFilter: "",
    total: -1,
  });
  if (
    query !== prevListKey.query ||
    statusFilter !== prevListKey.statusFilter ||
    claimRequests.length !== prevListKey.total
  ) {
    setPrevListKey({ query, statusFilter, total: claimRequests.length });
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedClaims = filteredClaims.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const rangeStart =
    filteredClaims.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredClaims.length);
  const visibleSelectedClaim = filteredClaims.some(
    (claim) => claim.id === selectedClaimId,
  )
    ? selectedClaim
    : null;
  // Other requests filed for the same item, so competing claims can be
  // compared side by side before approving one.
  const siblingClaims = visibleSelectedClaim
    ? claimRequests.filter(
        (claim) =>
          claim.itemId === visibleSelectedClaim.itemId &&
          claim.id !== visibleSelectedClaim.id,
      )
    : [];
  const claimCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const claim of claimRequests) {
      counts.set(claim.itemId, (counts.get(claim.itemId) ?? 0) + 1);
    }
    return counts;
  }, [claimRequests]);
  const baseItemPost = visibleSelectedClaim
    ? reports.find((report) => report.id === visibleSelectedClaim.itemId)
    : undefined;
  const selectedItemPost =
    baseItemPost && itemStatusOverrides[baseItemPost.id]
      ? { ...baseItemPost, status: itemStatusOverrides[baseItemPost.id] }
      : baseItemPost;
  const selectedItemImage = selectedItemPost?.image ?? "";

  const closeApprovalDialog = () => {
    setPendingStatusChange(null);
    if (approvalDialogRef.current?.open) approvalDialogRef.current.close();
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange || !claimForStatusChange) return;
    if (pendingStatusChange.status === "ItemClaimed") {
      onItemStatusChange(claimForStatusChange.itemId, "Claimed");
      onClaimStatusChange(pendingStatusChange.claimId, "Claimed");
    } else {
      onClaimStatusChange(
        pendingStatusChange.claimId,
        pendingStatusChange.status,
      );
    }
    closeApprovalDialog();
  };

  return (
    <div className="overflow-x-clip">
      {pendingStatusChange && claimForStatusChange && (
        <dialog
          ref={approvalDialogRef}
          aria-labelledby="claim-status-title"
          aria-describedby="claim-status-description"
          onClose={() => setPendingStatusChange(null)}
          className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0 text-neutral-900 dark:text-neutral-100 shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        >
          <div className="p-5 sm:p-6">
            <h2
              id="claim-status-title"
              className="text-base font-bold text-neutral-900 dark:text-neutral-100"
            >
              {pendingStatusChange.status === "Approved"
                ? "Approve this request?"
                : pendingStatusChange.status === "ItemClaimed"
                  ? "Mark this item as claimed?"
                  : pendingStatusChange.status === "Rejected"
                    ? "Reject this request?"
                    : "Mark this item as returned?"}
            </h2>
            <p
              id="claim-status-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              {pendingStatusChange.status === "Approved"
                ? `Are you sure you want to approve ${claimForStatusChange.claimant}'s claim for ${claimForStatusChange.item}?`
                : pendingStatusChange.status === "ItemClaimed"
                  ? `Has ${claimForStatusChange.claimant} already claimed the ${claimForStatusChange.item}?`
                  : pendingStatusChange.status === "Rejected"
                    ? `Are you sure you want to reject ${claimForStatusChange.claimant}'s claim for ${claimForStatusChange.item}?`
                    : `Confirm that ${claimForStatusChange.claimant} has received ${claimForStatusChange.item}.`}
            </p>
            {pendingStatusChange.status === "Approved" && (
              <p className="mt-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                Once approved, the system will notify{" "}
                {claimForStatusChange.claimant} to proceed to the OSA office
                to claim the item.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeApprovalDialog}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="h-9 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                {pendingStatusChange.status === "Approved"
                  ? "Confirm"
                  : pendingStatusChange.status === "ItemClaimed"
                    ? "Confirm claimed"
                    : pendingStatusChange.status === "Rejected"
                      ? "Confirm"
                      : "Confirm returned"}
              </button>
            </div>
          </div>
        </dialog>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {filteredClaims.length} claims
        </p>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(360px,1.3fr)]">
        <Panel
          title="Submitted claims"
          stickyHeader
          className="overflow-x-clip no-scrollbar xl:sticky xl:top-20 xl:flex xl:h-[min(53.5rem,calc(100dvh-6rem))] xl:flex-col xl:self-start xl:overflow-y-auto"
          action={
            <div className="flex">
              <StatusFilter
                value={statusFilter}
                onChange={onStatusFilterChange}
                options={statusOptions}
              />
            </div>
          }
        >
          {filteredClaims.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No claims match this search.
            </p>
          ) : (
            <>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pagedClaims.map((claim) => {
                const itemImage =
                  reports.find((report) => report.id === claim.itemId)
                    ?.image ?? "";

                return (
                  <button
                    key={claim.id}
                    type="button"
                    aria-pressed={selectedClaimId === claim.id}
                    onClick={() => onSelectClaim(claim.id)}
                    className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] sm:px-5 ${
                      selectedClaimId === claim.id
                        ? "bg-neutral-50 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:bg-neutral-800/70 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={`${claim.item} item`}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <NoItemImage compact className="h-12 w-12" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block break-normal text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                        {claim.item}
                      </span>
                    <span className="mt-1 block max-h-8 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                      {claim.claimant} · {claim.id}
                      {(claimCounts.get(claim.itemId) ?? 1) > 1 && (
                        <span className="ml-1.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          {claimCounts.get(claim.itemId)} requests
                        </span>
                      )}
                    </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">
                        Submitted
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                        {claim.submitted}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Showing {rangeStart}–{rangeEnd} of {filteredClaims.length}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      type="button"
                      onClick={() => setPage(index + 1)}
                      aria-label={`Page ${index + 1}`}
                      aria-current={
                        safePage === index + 1 ? "page" : undefined
                      }
                      className={`h-7 min-w-7 rounded-md px-1.5 text-[11px] font-semibold transition-colors ${
                        safePage === index + 1
                          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    aria-label="Next page"
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </Panel>

        <Panel
          title={visibleSelectedClaim?.item ?? "Claim details"}
          titleSize="large"
          borderless
        >
          {visibleSelectedClaim ? (
            <div className="space-y-4 p-4 sm:p-5">
              <section aria-labelledby="claim-item-post-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="claim-item-post-heading"
                    className="text-sm font-bold text-neutral-900 dark:text-neutral-100"
                  >
                    {selectedItemPost?.type === "Found"
                      ? "Found item"
                      : "Lost item"}
                  </h2>
                  {selectedItemPost && (
                    <StatusBadge status={selectedItemPost.type} />
                  )}
                </div>
                <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0">
                    {selectedItemImage ? (
                      <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800">
                        <img
                          src={selectedItemImage}
                          alt={`${visibleSelectedClaim.item} item`}
                          className="h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <NoItemImage
                        title="No item photo provided"
                        subtitle="This report did not include any photos of the item."
                        className="h-72 w-full"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    {selectedItemPost ? (
                      <>
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {selectedItemPost.reportedBy}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {selectedItemPost.reporterEmail}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                          {selectedItemPost.description}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 dark:border-neutral-800 py-3 text-xs">
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Tag className="h-3 w-3" aria-hidden="true" />
                          Category
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.category || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Post date
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.date || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <CalendarClock
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          {selectedItemPost.type === "Found"
                            ? "Date found"
                            : "Date lost"}
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatEventDate(selectedItemPost.eventDateTime)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          Time found
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatEventTime(selectedItemPost.eventDateTime)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Specific location
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.specificLocation || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          Building
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.buildingName?.trim() || "None"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Palette className="h-3 w-3" aria-hidden="true" />
                          Color
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.color?.trim() || "None"}
                        </dd>
                      </div>
                    </dl>
                      </>
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        The original item post could not be found.
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <ClaimRequestSection
                claim={visibleSelectedClaim}
                headingId="claim-request-heading"
                title={
                  siblingClaims.length > 0
                    ? `Claim request (${siblingClaims.length + 1})`
                    : "Claim request"
                }
                itemType={selectedItemPost?.type}
                itemClaimed={selectedItemPost?.status === "Claimed"}
                onRequestStatus={(claimId, status) =>
                  setPendingStatusChange({ claimId, status })
                }
              />
              {siblingClaims.length > 0 && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="space-y-2">
                    {siblingClaims.map((sibling) => (
                      <ClaimRequestSection
                        key={sibling.id}
                        claim={sibling}
                        headingId={`claim-request-${sibling.id}`}
                        itemType={selectedItemPost?.type}
                        itemClaimed={selectedItemPost?.status === "Claimed"}
                        onRequestStatus={(claimId, status) =>
                          setPendingStatusChange({ claimId, status })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No selected claim matches this search.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

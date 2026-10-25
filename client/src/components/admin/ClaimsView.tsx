import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  MapPin,
  Package,
  Palette,
  Tag,
  X,
} from "lucide-react";
import { Panel } from "./Panel";
import { NoItemImage } from "@/components/NoItemImage";
import {
  AdminPasswordModal,
  LockedValue,
} from "./SensitiveDetails";
import { useSensitiveUnlock } from "./useSensitiveUnlock";
import { StatusBadge } from "./StatusBadge";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { StatusFilter } from "./StatusFilter";
import type { AdminReport } from "./types";
import type { ClaimRequest } from "@/types/claim";
import { getClaimantEmail } from "@/types/claim";
import { extractIdNumberFromEmail } from "@/lib/idNumber";

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

type StatusDecision =
  | "Approved"
  | "Returned"
  | "ItemClaimed"
  | "Rejected";

function ClaimRequestSection({
  claim,
  headingId,
  title,
  itemType,
  itemClaimed,
  itemReceived,
  onRequestStatus,
  unlocked,
  onRequestUnlock,
}: {
  claim: ClaimRequest;
  headingId: string;
  title?: string;
  itemType: "Lost" | "Found" | undefined;
  itemClaimed: boolean;
  itemReceived: boolean;
  onRequestStatus: (claimId: string, status: StatusDecision) => void;
  unlocked: boolean;
  onRequestUnlock: () => void;
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
          {claim.status !== "Claimed" && claim.status !== "Rejected" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  claim.status === "Returned" ||
                  (!isLostItem &&
                    claim.status !== "Approved" &&
                    !itemReceived) ||
                  (!isLostItem && itemClaimed && claim.status !== "Approved")
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
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-[#E5192D]"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {claim.status === "Returned"
                  ? "Returned"
                  : claim.status === "Approved" && !isLostItem
                    ? "Claimed"
                    : isLostItem
                      ? "Mark as returned"
                      : "Approve request"}
              </button>
              <button
                type="button"
                disabled={
                  claim.status !== "Pending" && claim.status !== "Approved"
                }
                onClick={() => onRequestStatus(claim.id, "Rejected")}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default ${
                  claim.status === "Pending" || claim.status === "Approved"
                    ? "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500"
                }`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Reject
              </button>
            </div>
          )}
          {!isLostItem &&
            claim.status === "Pending" &&
            !itemReceived && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Approval is unavailable until the physical item is received by OSA.
              </p>
            )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {claim.claimant}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            Id number: {extractIdNumberFromEmail(getClaimantEmail(claim)) || "N/A"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {claim.details}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 dark:border-neutral-800 py-3 text-xs">
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
              <Palette className="h-3 w-3" aria-hidden="true" />
              Primary color
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.color?.trim() || "None"}
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
              {itemType === "Lost" ? "Location found" : "Location lost"}
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.location}
            </dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <Building2 className="h-3 w-3" aria-hidden="true" />
              Building
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {claim.building?.trim() || "None"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Important details
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              <LockedValue
                value={claim.importantDetails}
                unlocked={unlocked}
                onUnlock={onRequestUnlock}
              />
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
  query,
  selectedClaimId,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  plainDetails = false,
  onOsaReceiptChange,
  isUpdatingOsaReceipt = false,
}: {
  claims: ClaimRequest[];
  reports: AdminReport[];
  onClaimStatusChange: (
    id: string,
    status: ClaimRequest["status"],
  ) => Promise<void>;
  query: string;
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions?: string[];
  plainDetails?: boolean;
  onOsaReceiptChange: (id: string, receivedByOsa: boolean) => void;
  isUpdatingOsaReceipt?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    claimId: string;
    status: StatusDecision;
  } | null>(null);
  const [savingStatusChange, setSavingStatusChange] = useState(false);
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
      (statusFilter === "All" || claim.status === statusFilter) &&
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
  const visibleSelectedClaim =
    filteredClaims.find((claim) => claim.id === selectedClaimId) ?? null;
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
  const selectedItemPost = baseItemPost;
  const selectedItemImage = selectedItemPost?.image ?? "";

  const { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen } =
    useSensitiveUnlock();

  const closeApprovalDialog = () => {
    setPendingStatusChange(null);
    if (approvalDialogRef.current?.open) approvalDialogRef.current.close();
  };

  const FINAL_CLAIM_STATUSES = new Set([
    "Approved",
    "Claimed",
    "Returned",
    "Rejected",
  ]);

  // Other open requests for the same item: accepting one resolves the item,
  // so the rest are rejected automatically on confirm.
  const claimsToAutoReject = claimForStatusChange
    ? claimRequests.filter(
        (claim) =>
          claim.id !== claimForStatusChange.id &&
          claim.itemId === claimForStatusChange.itemId &&
          !FINAL_CLAIM_STATUSES.has(claim.status),
      )
    : [];
  const isAcceptDecision =
    pendingStatusChange?.status === "Approved" ||
    pendingStatusChange?.status === "ItemClaimed" ||
    pendingStatusChange?.status === "Returned";

  const confirmStatusChange = async () => {
    if (!pendingStatusChange || !claimForStatusChange || savingStatusChange) {
      return;
    }
    setSavingStatusChange(true);
    try {
      const confirmedStatus =
        pendingStatusChange.status === "ItemClaimed"
          ? "Claimed"
          : pendingStatusChange.status;
      await onClaimStatusChange(
        pendingStatusChange.claimId,
        confirmedStatus,
      );

      if (pendingStatusChange.status === "ItemClaimed") {
        toast.success(
          `Marked "${claimForStatusChange.item}" as claimed for ${claimForStatusChange.claimant}.`,
        );
      } else if (pendingStatusChange.status === "Approved") {
        toast.success(
          `Approved ${claimForStatusChange.claimant}'s claim for "${claimForStatusChange.item}".`,
        );
      } else if (pendingStatusChange.status === "Rejected") {
        toast.success(
          `Rejected ${claimForStatusChange.claimant}'s claim for "${claimForStatusChange.item}".`,
        );
      } else {
        toast.success(
          `Marked "${claimForStatusChange.item}" as returned for ${claimForStatusChange.claimant}.`,
        );
      }

      if (isAcceptDecision && claimsToAutoReject.length > 0) {
        const results = await Promise.allSettled(
          claimsToAutoReject.map((sibling) =>
            onClaimStatusChange(sibling.id, "Rejected"),
          ),
        );
        if (results.some((result) => result.status === "rejected")) {
          toast.error(
            "The claim was updated, but one or more competing requests could not be rejected.",
          );
        }
      }
      closeApprovalDialog();
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof message === "string"
          ? message
          : "Could not update this claim. Please try again.",
      );
    } finally {
      setSavingStatusChange(false);
    }
  };

  return (
    <div className="overflow-x-clip">
      {pendingStatusChange && claimForStatusChange && (
        <dialog
          ref={approvalDialogRef}
          aria-labelledby="claim-status-title"
          aria-describedby="claim-status-description"
          onCancel={(event) => {
            if (savingStatusChange) event.preventDefault();
          }}
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
            {isAcceptDecision && claimsToAutoReject.length > 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {claimsToAutoReject.length === 1
                  ? "1 other open request for this item will be automatically rejected."
                  : `${claimsToAutoReject.length} other open requests for this item will be automatically rejected.`}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeApprovalDialog}
                disabled={savingStatusChange}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={savingStatusChange}
                className="h-9 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {savingStatusChange
                  ? "Saving…"
                  : pendingStatusChange.status === "Approved"
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
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(360px,1.3fr)]">
        <Panel
          title="Submitted Claims Request"
          titleAdornment={
            <span className="shrink-0 text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {filteredClaims.length}
            </span>
          }
          stickyHeader
          className="overflow-x-clip no-scrollbar xl:sticky xl:top-20 xl:flex xl:h-[min(53.5rem,calc(100dvh-6rem))] xl:flex-col xl:self-start xl:overflow-y-auto"
          action={
            <div className="flex items-center">
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
              No claim requests match this search.
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
                      {claim.claimant}
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
          title={visibleSelectedClaim?.item ?? ""}
          titleSize="large"
          borderless
          plain={plainDetails}
          className={
            plainDetails
              ? "min-h-[min(36rem,calc(100dvh-8rem))] xl:min-h-[min(53.5rem,calc(100dvh-6rem))]"
              : ""
          }
        >
          {visibleSelectedClaim ? (
            <div
              className={
                plainDetails ? "space-y-4" : "space-y-4 p-4 sm:p-5"
              }
            >
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
                          Id number: {extractIdNumberFromEmail(selectedItemPost.reporterEmail) || "N/A"}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                          {selectedItemPost.description}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 dark:border-neutral-800 py-3 text-xs">
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
                          {selectedItemPost.type === "Found" ? "Time found" : "Time lost"}
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatEventTime(selectedItemPost.eventDateTime)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {selectedItemPost.type === "Lost"
                            ? "Location lost"
                            : "Location found"}
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
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Palette className="h-3 w-3" aria-hidden="true" />
                          Color
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemPost.color?.trim() || "None"}
                        </dd>
                      </div>
                      {selectedItemPost.type === "Found" && (
                        <div>
                          <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                            <Package className="h-3 w-3" aria-hidden="true" />
                            Physical Item
                          </dt>
                          <dd className="mt-1">
                            <OsaReceiptStatus received={selectedItemPost.receivedByOsa} />
                            <button
                              type="button"
                              disabled={isUpdatingOsaReceipt}
                              onClick={() =>
                                onOsaReceiptChange(
                                  selectedItemPost.id,
                                  !selectedItemPost.receivedByOsa,
                                )
                              }
                              className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60"
                            >
                              {isUpdatingOsaReceipt
                                ? "Updating…"
                                : selectedItemPost.receivedByOsa
                                  ? "Mark not yet received"
                                  : "Mark received"}
                            </button>
                          </dd>
                        </div>
                      )}
                      <div className="col-span-2">
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Important details
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                          <LockedValue
                            value={selectedItemPost.confidentialInfo}
                            unlocked={unlocked}
                            onUnlock={requestUnlock}
                          />
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
                itemReceived={selectedItemPost?.receivedByOsa ?? false}
                onRequestStatus={(claimId, status) =>
                  setPendingStatusChange({ claimId, status })
                }
                unlocked={unlocked}
                onRequestUnlock={requestUnlock}
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
                        itemReceived={selectedItemPost?.receivedByOsa ?? false}
                        onRequestStatus={(claimId, status) =>
                          setPendingStatusChange({ claimId, status })
                        }
                        unlocked={unlocked}
                        onRequestUnlock={requestUnlock}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p
              className={
                plainDetails
                  ? "flex flex-1 items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  : "px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
              }
            >
              No selected claim matches this search.
            </p>
          )}
        </Panel>
      </div>
      <AdminPasswordModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSubmit={submitPassword}
      />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  MapPin,
  Palette,
  Tag,
  X,
} from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";
import { resolveIdNumber } from "@/lib/idNumber";
import { getClaimantEmail, type ClaimRequest } from "@/types/claim";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import {
  FilterChips,
  OriginalPostButton,
  OriginalPostCard,
  OriginalPostDialog,
  RequestSelectorCard,
  ReviewHeader,
  ReviewPager,
  SubmittedAnswersLedger,
  type ReviewFactRow,
  type ReviewLedgerRow,
  type ReviewStep,
} from "./ReviewLayout";
import { AdminPasswordModal, LockedValue } from "./SensitiveDetails";
import { StatusBadge } from "./StatusBadge";
import type { AdminReport } from "./types";
import {
  compareRequestWithPost,
  formatAdminEventDate,
  formatAdminEventTime,
  sortRequestsByPostMatch,
} from "./requestComparison";
import { useSensitiveUnlock } from "./useSensitiveUnlock";

const LIST_PAGE_SIZE = 10;
const DETAIL_PAGE_SIZE = 4;

const DEFAULT_CLAIM_FILTERS = [
  "All",
  "Pending",
  "Approved",
  "Claimed",
  "Rejected",
];

type StatusDecision = "Approved" | "Returned" | "ItemClaimed" | "Rejected";

function buildPostFacts(
  post: AdminReport | undefined,
  fallbackTitle: string,
  unlocked: boolean,
  onUnlock: () => void,
): ReviewFactRow[] {
  if (!post) return [];
  const isFound = post.type === "Found";
  return [
    {
      id: "item-name",
      icon: Tag,
      label: "Item name",
      value: post.title || fallbackTitle || "None",
    },
    {
      id: "category",
      icon: Tag,
      label: "Category",
      value: post.category || "None",
    },
    {
      id: "event-date",
      icon: CalendarClock,
      label: isFound ? "Date found" : "Date lost",
      value: formatAdminEventDate(post.eventDateTime),
    },
    {
      id: "event-time",
      icon: Clock3,
      label: isFound ? "Time found" : "Time lost",
      value: formatAdminEventTime(post.eventDateTime),
    },
    {
      id: "building",
      icon: Building2,
      label: "Building",
      value: post.buildingName?.trim() || "None",
    },
    {
      id: "location",
      icon: MapPin,
      label: isFound ? "Location found" : "Location lost",
      value: post.specificLocation || "None",
    },
    {
      id: "color",
      icon: Palette,
      label: "Color",
      value: post.color?.trim() || "None",
    },
    {
      id: "important-details",
      icon: Lock,
      label: "Important details",
      value: (
        <LockedValue
          value={post.confidentialInfo}
          unlocked={unlocked}
          onUnlock={onUnlock}
        />
      ),
    },
  ];
}

/** Full-page list of grouped found-item claim requests. */
export function ClaimsListPanel({
  claims: claimRequests,
  reports,
  query,
  statusFilter,
  onStatusFilterChange,
  statusOptions = DEFAULT_CLAIM_FILTERS,
  onSelectClaim,
}: {
  claims: ClaimRequest[];
  reports: AdminReport[];
  query: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions?: string[];
  onSelectClaim: (id: string) => void;
}) {
  const [page, setPage] = useState(1);

  const queryMatchedClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return claimRequests.filter((claim) =>
      [claim.id, claim.item, claim.claimant, claim.location]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [claimRequests, query]);

  const groupClaims = (items: ClaimRequest[]) => {
    const groups = new Map<string, ClaimRequest[]>();
    for (const claim of items) {
      const group = groups.get(claim.itemId) ?? [];
      group.push(claim);
      groups.set(claim.itemId, group);
    }
    return Array.from(groups.values()).map((claims) => ({
      representative: claims[0],
      claims,
    }));
  };

  const chipOptions = useMemo(
    () =>
      statusOptions.map((option) => ({
        key: option,
        label: option,
        count: groupClaims(
          option === "All"
            ? queryMatchedClaims
            : queryMatchedClaims.filter((claim) => claim.status === option),
        ).length,
      })),
    [queryMatchedClaims, statusOptions],
  );

  const claimGroups = useMemo(() => {
    const filtered =
      statusFilter === "All"
        ? queryMatchedClaims
        : queryMatchedClaims.filter((claim) => claim.status === statusFilter);
    return groupClaims(filtered);
  }, [queryMatchedClaims, statusFilter]);

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

  const totalPages = Math.max(
    1,
    Math.ceil(claimGroups.length / LIST_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pagedClaims = claimGroups.slice(
    (safePage - 1) * LIST_PAGE_SIZE,
    safePage * LIST_PAGE_SIZE,
  );
  const rangeStart =
    claimGroups.length === 0 ? 0 : (safePage - 1) * LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * LIST_PAGE_SIZE, claimGroups.length);

  return (
    <section aria-labelledby="claims-list-heading" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
            Found items · Claims queue
          </p>
          <h1
            id="claims-list-heading"
            className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-[-0.02em] text-neutral-900 dark:text-neutral-100"
          >
            <span>Submitted Claims Request</span>
            <span className="font-mono text-base font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
              {claimGroups.length}
            </span>
          </h1>
        </div>
        <FilterChips
          options={chipOptions}
          value={statusFilter}
          onChange={onStatusFilterChange}
          ariaLabel="Filter claims by status"
        />
      </div>

      {claimGroups.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-neutral-300 bg-white px-5 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          No claim requests match this filter.
        </div>
      ) : (
        <>
          <div className="grid gap-2.5">
            {pagedClaims.map((group) => {
              const claim = group.representative;
              const itemImage =
                reports.find((report) => report.id === claim.itemId)?.image ??
                "";
              const claimantNames = group.claims
                .map((request) => request.claimant)
                .filter((name, index, names) => names.indexOf(name) === index);

              return (
                <button
                  key={claim.itemId}
                  type="button"
                  onClick={() => onSelectClaim(claim.id)}
                  className="flex w-full items-center gap-3.5 rounded-[14px] border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
                >
                  {itemImage ? (
                    <img
                      src={itemImage}
                      alt={`${claim.item} item`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-[10px] object-cover"
                    />
                  ) : (
                    <NoItemImage compact className="h-12 w-12 rounded-[10px]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {claim.item}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="truncate">{claimantNames.join(", ")}</span>
                      {group.claims.length > 1 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                          {group.claims.length} requests
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={claim.status} />
                    <span className="hidden text-right sm:block">
                      <span className="block text-[10px] uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                        Submitted
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {claim.submitted}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-neutral-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <ReviewPager
            page={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={claimGroups.length}
            itemUnitLabel="posts"
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

/** Detail and review panel for a claim request and any competing claims on the same post. */
export function ClaimDetailPanel({
  claim,
  siblingClaims,
  allClaims,
  reports,
  onClaimStatusChange,
  onOsaReceiptChange,
  isUpdatingOsaReceipt = false,
}: {
  claim: ClaimRequest;
  siblingClaims: ClaimRequest[];
  allClaims: ClaimRequest[];
  reports: AdminReport[];
  onClaimStatusChange: (
    id: string,
    status: ClaimRequest["status"],
  ) => Promise<void>;
  onOsaReceiptChange: (id: string, receivedByOsa: boolean) => void;
  isUpdatingOsaReceipt?: boolean;
  plainDetails?: boolean;
}) {
  const [selectedRequestId, setSelectedRequestId] = useState(claim.id);
  const [page, setPage] = useState(1);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    claimId: string;
    status: StatusDecision;
  } | null>(null);
  const [savingStatusChange, setSavingStatusChange] = useState(false);
  const approvalDialogRef = useRef<HTMLDialogElement>(null);

  const [prevRouteClaimId, setPrevRouteClaimId] = useState(claim.id);
  if (claim.id !== prevRouteClaimId) {
    setPrevRouteClaimId(claim.id);
    setSelectedRequestId(claim.id);
    setPage(1);
  }

  const selectedItemPost = reports.find(
    (report) => report.id === claim.itemId,
  );
  const sortedPostClaims = useMemo(
    () =>
      sortRequestsByPostMatch([claim, ...siblingClaims], selectedItemPost),
    [claim, siblingClaims, selectedItemPost],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedPostClaims.length / DETAIL_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleClaims = sortedPostClaims.slice(
    (safePage - 1) * DETAIL_PAGE_SIZE,
    safePage * DETAIL_PAGE_SIZE,
  );
  const rangeStart =
    sortedPostClaims.length === 0 ? 0 : (safePage - 1) * DETAIL_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safePage * DETAIL_PAGE_SIZE,
    sortedPostClaims.length,
  );

  const activeClaim =
    visibleClaims.find((item) => item.id === selectedRequestId) ??
    sortedPostClaims.find((item) => item.id === selectedRequestId) ??
    visibleClaims[0] ??
    null;

  const claimForStatusChange = allClaims.find(
    (item) => item.id === pendingStatusChange?.claimId,
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

  const { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen } =
    useSensitiveUnlock();

  const claimsToAutoReject =
    claimForStatusChange && pendingStatusChange?.status === "Approved"
      ? allClaims.filter(
          (item) =>
            item.id !== claimForStatusChange.id &&
            item.itemId === claimForStatusChange.itemId &&
            item.status === "Pending",
        )
      : [];

  const closeApprovalDialog = () => {
    setPendingStatusChange(null);
    if (approvalDialogRef.current?.open) approvalDialogRef.current.close();
  };

  const isAcceptDecision = pendingStatusChange?.status === "Approved";

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

  const isLostItem = selectedItemPost?.type === "Lost";
  const itemReceived = selectedItemPost?.receivedByOsa ?? false;
  const itemClaimed = selectedItemPost?.status === "Claimed";
  const hasClaimed =
    itemClaimed || sortedPostClaims.some((item) => item.status === "Claimed");
  const hasApproved = sortedPostClaims.some(
    (item) => item.status === "Approved",
  );
  const hasReturned = sortedPostClaims.some(
    (item) => item.status === "Returned",
  );
  const pendingCount = sortedPostClaims.filter(
    (item) => item.status === "Pending",
  ).length;

  const steps: ReviewStep[] = [
    {
      label: isLostItem ? "Lost posted" : "Found posted",
      detail: selectedItemPost?.date || claim.submitted || "Recorded",
      state: "done",
    },
    {
      label: "Received by OSA",
      detail: itemReceived ? "Item in custody" : "Awaiting drop-off",
      state: itemReceived ? "done" : "current",
    },
    {
      label: "Claims in",
      detail: `${sortedPostClaims.length} ${
        sortedPostClaims.length === 1 ? "request" : "requests"
      }`,
      state: sortedPostClaims.length > 0 ? "done" : "current",
    },
    {
      label: isLostItem ? "Returned" : "Claimed",
      detail: hasClaimed
        ? "Claimed"
        : hasReturned
          ? "Returned"
          : hasApproved
            ? "Approved"
            : `${pendingCount} to review`,
      state:
        hasClaimed || hasReturned
          ? "done"
          : hasApproved || (itemReceived && sortedPostClaims.length > 0)
            ? "current"
            : "upcoming",
    },
  ];

  const postFacts = buildPostFacts(
    selectedItemPost,
    claim.item,
    unlocked,
    requestUnlock,
  );
  const reporterId = selectedItemPost
    ? resolveIdNumber(
        selectedItemPost.reporterSchoolId,
        selectedItemPost.reporterEmail,
      ) || "N/A"
    : "N/A";
  const reporterMeta = selectedItemPost
    ? `${isLostItem ? "Owner" : "Finder"} · ID ${reporterId}`
    : "Original post details unavailable";

  const activeComparison = activeClaim
    ? compareRequestWithPost(activeClaim, selectedItemPost)
    : null;

  const activeLedgerRows: ReviewLedgerRow[] = activeClaim
    ? [
        {
          id: "color",
          icon: Palette,
          label: "Primary color",
          value: activeClaim.color?.trim() || "None",
          note: activeComparison?.color.note,
        },
        {
          id: "date",
          icon: CalendarDays,
          label: isLostItem ? "Date found" : "Date lost",
          value: activeClaim.dateLost || "None",
          note: activeComparison?.date.note,
        },
        {
          id: "time",
          icon: Clock3,
          label: isLostItem ? "Time found" : "Time lost",
          value: activeClaim.timeLost || "None",
          note: activeComparison?.time.note,
        },
        {
          id: "location",
          icon: MapPin,
          label: isLostItem ? "Location found" : "Location lost",
          value: activeClaim.location || "None",
          note: activeComparison?.location.note,
        },
        {
          id: "building",
          icon: Building2,
          label: "Building",
          value: activeClaim.building?.trim() || "None",
          note: activeComparison?.building.note,
        },
        {
          id: "details",
          icon: FileText,
          label: "Details",
          value: activeClaim.details?.trim() || "No additional details provided.",
        },
        {
          id: "important-details",
          icon: Lock,
          label: "Important details",
          value: (
            <LockedValue
              value={activeClaim.importantDetails}
              unlocked={unlocked}
              onUnlock={requestUnlock}
            />
          ),
          note: unlocked
            ? undefined
            : "Protected detail. Enter your staff or admin password to reveal.",
        },
      ]
    : [];

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
          className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
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
              <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Once approved, the system will notify{" "}
                {claimForStatusChange.claimant} to proceed to the OSA office to
                claim the item.
              </p>
            )}
            {isAcceptDecision && claimsToAutoReject.length > 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
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
                className="h-9 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
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

      <ReviewHeader
        eyebrow={`${isLostItem ? "Lost" : "Found"} item · Claim review`}
        title={claim.item}
        itemType={selectedItemPost?.type}
        stateLabel={
          hasClaimed
            ? "Claimed"
            : hasReturned
              ? "Returned"
              : hasApproved
                ? "Approved"
                : "Open for claims"
        }
        stateTone={hasClaimed || hasReturned || hasApproved ? "ok" : "warn"}
        subtitle={`One post, ${sortedPostClaims.length} ${
          sortedPostClaims.length === 1 ? "claim request" : "claim requests"
        } to review.`}
        steps={steps}
      />

      <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-12">
        <OriginalPostCard
          postedDateLabel={
            selectedItemPost?.date
              ? `Posted ${selectedItemPost.date}`
              : "Original post"
          }
          image={selectedItemPost?.image}
          imageAlt={`${claim.item} item`}
          reporterName={selectedItemPost?.reportedBy || "Unavailable"}
          reporterMeta={reporterMeta}
          facts={postFacts}
          notes={selectedItemPost?.description}
          footer={
            selectedItemPost?.type === "Found" ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Physical item
                  </p>
                  <div className="mt-0.5">
                    <OsaReceiptStatus received={selectedItemPost.receivedByOsa} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingOsaReceipt}
                  onClick={() =>
                    onOsaReceiptChange(
                      selectedItemPost.id,
                      !selectedItemPost.receivedByOsa,
                    )
                  }
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-[10px] border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500"
                >
                  {isUpdatingOsaReceipt
                    ? "Updating…"
                    : selectedItemPost.receivedByOsa
                      ? "Mark not yet received"
                      : "Mark received"}
                </button>
              </div>
            ) : undefined
          }
        />

        <section aria-labelledby="claim-requests-list-heading" className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="claim-requests-list-heading"
              className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Claim requests{" "}
              <span className="font-mono font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
                {sortedPostClaims.length}
              </span>
            </h2>
          </div>

          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
            {selectedItemPost
              ? "Sorted by match with the post"
              : "Submitted claim requests"}
          </p>

          {sortedPostClaims.length === 0 ? (
            <div className="mt-3.5 mb-6 rounded-[14px] border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No claim requests submitted for this post yet.
            </div>
          ) : (
            <>
              <div className="mt-3.5 mb-4 grid gap-2.5">
                {visibleClaims.map((item) => {
                  const comparison = compareRequestWithPost(
                    item,
                    selectedItemPost,
                  );
                  const tones = selectedItemPost
                    ? [
                        comparison.color.status,
                        comparison.date.status,
                        comparison.location.status,
                        comparison.building.status,
                      ]
                    : undefined;
                  const idNum =
                    resolveIdNumber(item.schoolId, getClaimantEmail(item)) ||
                    "N/A";
                  return (
                    <RequestSelectorCard
                      key={item.id}
                      name={item.claimant}
                      subtitle={`ID ${idNum} · ${item.submitted}`}
                      status={item.status}
                      selected={activeClaim?.id === item.id}
                      matchTones={tones}
                      onClick={() => setSelectedRequestId(item.id)}
                    />
                  );
                })}
              </div>

              <div className="mb-7">
                <ReviewPager
                  page={safePage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalItems={sortedPostClaims.length}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    const nextVisible = sortedPostClaims.slice(
                      (nextPage - 1) * DETAIL_PAGE_SIZE,
                      nextPage * DETAIL_PAGE_SIZE,
                    );
                    if (nextVisible[0]) {
                      setSelectedRequestId(nextVisible[0].id);
                    }
                  }}
                />
              </div>
            </>
          )}

          {activeClaim && (
            <div className="rounded-[20px] border border-neutral-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.10)] sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
              <div className="mb-6">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
                  Claimant evidence
                </p>
                {activeClaim.evidence && activeClaim.evidence.length > 0 ? (
                  <div
                    className={`grid gap-3 ${
                      activeClaim.evidence.length > 1
                        ? "sm:grid-cols-2"
                        : "max-w-[340px]"
                    }`}
                  >
                    {activeClaim.evidence.map((image, index) => (
                      <div
                        key={`${activeClaim.id}-evidence-${index}`}
                        className="aspect-[4/3] overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                      >
                        <img
                          src={image}
                          alt={`Photo evidence ${index + 1} submitted by ${activeClaim.claimant}`}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-[340px]">
                    <NoItemImage
                      title="No photo evidence provided"
                      subtitle="The claimant did not attach any photos to this request."
                      className="aspect-[4/3] rounded-[14px]"
                    />
                  </div>
                )}
              </div>

              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
                    {activeClaim.claimant}
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    ID{" "}
                    {resolveIdNumber(
                      activeClaim.schoolId,
                      getClaimantEmail(activeClaim),
                    ) || "N/A"}{" "}
                    · Submitted {activeClaim.submitted}
                  </p>
                  {selectedItemPost && (
                    <OriginalPostButton onClick={() => setPostModalOpen(true)} />
                  )}
                </div>
                <StatusBadge status={activeClaim.status} />
              </div>

              {!isLostItem &&
                activeClaim.status === "Pending" &&
                !itemReceived && (
                  <div className="mb-4 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                    Approval is unavailable until the physical item is received
                    by OSA.
                  </div>
                )}

              <SubmittedAnswersLedger
                submittedByLabel="Submitted by claimant"
                rows={activeLedgerRows}
              />

              {activeClaim.status !== "Claimed" &&
                activeClaim.status !== "Rejected" && (
                  <div className="mt-7 flex flex-wrap justify-end gap-2.5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                    <button
                      type="button"
                      disabled={
                        activeClaim.status !== "Pending" &&
                        activeClaim.status !== "Approved"
                      }
                      onClick={() =>
                        setPendingStatusChange({
                          claimId: activeClaim.id,
                          status: "Rejected",
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={
                        activeClaim.status === "Returned" ||
                        (!isLostItem &&
                          activeClaim.status !== "Approved" &&
                          !itemReceived) ||
                        (!isLostItem &&
                          itemClaimed &&
                          activeClaim.status !== "Approved")
                      }
                      title={
                        !isLostItem &&
                        activeClaim.status === "Pending" &&
                        !itemReceived
                          ? "Item must be received by OSA before approving"
                          : undefined
                      }
                      onClick={() =>
                        setPendingStatusChange({
                          claimId: activeClaim.id,
                          status:
                            !isLostItem && activeClaim.status === "Approved"
                              ? "ItemClaimed"
                              : isLostItem
                                ? "Returned"
                                : "Approved",
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {activeClaim.status === "Returned"
                        ? "Returned"
                        : activeClaim.status === "Approved" && !isLostItem
                          ? "Mark as claimed"
                          : isLostItem
                            ? "Mark as returned"
                            : "Approve request"}
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>
      </div>

      {selectedItemPost && (
        <OriginalPostDialog
          open={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          image={selectedItemPost.image}
          imageAlt={`${claim.item} item`}
          reporterName={selectedItemPost.reportedBy}
          reporterMeta={`${reporterMeta}${
            selectedItemPost.date ? ` · Posted ${selectedItemPost.date}` : ""
          }`}
          facts={postFacts}
          notes={selectedItemPost.description}
        />
      )}

      <AdminPasswordModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSubmit={submitPassword}
      />
    </div>
  );
}

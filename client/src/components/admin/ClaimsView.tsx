import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Bell, Check, ChevronRight, X } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { NoItemImage } from "@/components/NoItemImage";
import { resolveIdNumber } from "@/lib/idNumber";
import { getClaimantEmail, type ClaimRequest } from "@/types/claim";
import { OsaReceiptConfirmModal } from "./OsaReceiptConfirmModal";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { Panel } from "./Panel";
import {
  FilterChips,
  OriginalPostCard,
  ReviewPager,
  SubmittedRequestCard,
  type ReviewFactRow,
} from "./ReviewLayout";
import { AdminPasswordModal, LockedValue } from "./SensitiveDetails";
import type { AdminReport } from "./types";
import {
  formatAdminEventDate,
  formatAdminEventTime,
  sortRequestsByPostMatch,
} from "./requestComparison";
import { useSensitiveUnlock } from "./useSensitiveUnlock";

const LIST_PAGE_SIZE = 8;

const DEFAULT_CLAIM_FILTERS = [
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
      label: "Item name",
      value: post.title || fallbackTitle || "None",
    },
    {
      id: "color",
      label: "Primary color",
      value: post.color?.trim() || "None",
    },
    {
      id: "location",
      label: "Specific location",
      value: post.specificLocation || "None",
    },
    {
      id: "building",
      label: "Building",
      value: post.buildingName?.trim() || "None",
    },
    {
      id: "event-date",
      label: isFound ? "Date found" : "Date lost",
      value: formatAdminEventDate(post.eventDateTime),
    },
    {
      id: "event-time",
      label: isFound ? "Time found" : "Time lost",
      value: formatAdminEventTime(post.eventDateTime),
    },
    {
      id: "category",
      label: "Category",
      value: post.category || "None",
    },
    {
      id: "important-details",
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
  onSelectClaim,
}: {
  claims: ClaimRequest[];
  reports: AdminReport[];
  query: string;
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

  const claimGroups = useMemo(
    () => groupClaims(queryMatchedClaims),
    [queryMatchedClaims],
  );

  const [prevListKey, setPrevListKey] = useState({
    query: "",
    total: -1,
  });
  if (
    query !== prevListKey.query ||
    claimRequests.length !== prevListKey.total
  ) {
    setPrevListKey({ query, total: claimRequests.length });
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
    <FadeIn delay={0.05}>
      <Panel
        title="Claim requests"
        action={
          <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {claimGroups.length} {claimGroups.length === 1 ? "item" : "items"}
          </span>
        }
      >
        {claimGroups.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              No claim requests yet
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pagedClaims.map((group) => {
                const claim = group.representative;
                const itemImage =
                  reports.find((report) => report.id === claim.itemId)?.image ??
                  "";
                const claimantNames = group.claims
                  .map((request) => request.claimant)
                  .filter((name, index, names) => names.indexOf(name) === index);

                return (
                  <div key={claim.itemId}>
                    <button
                      type="button"
                      onClick={() => onSelectClaim(claim.id)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/40"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={`${claim.item} item`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <NoItemImage compact className="h-full w-full" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {claim.item}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="truncate">{claimantNames.join(", ")}</span>
                          {group.claims.length > 1 && (
                            <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                              · {group.claims.length} requests
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="hidden font-mono text-xs tabular-nums text-neutral-500 sm:block dark:text-neutral-400">
                          {claim.submitted}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 text-neutral-400 dark:text-neutral-500"
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {claimGroups.length > 0 && (
              <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
                <ReviewPager
                  page={safePage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalItems={claimGroups.length}
                  itemUnitLabel={claimGroups.length === 1 ? "item" : "items"}
                  showRange
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Panel>
    </FadeIn>
  );
}

const FINDER_REMINDER_COOLDOWN_MS = 3 * 60 * 60 * 1000;

function formatCooldownRemaining(remainingMs: number): string {
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes <= 1) return "1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
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
  onRemindFinder,
  isRemindingFinder = false,
}: {
  claim: ClaimRequest;
  siblingClaims: ClaimRequest[];
  allClaims: ClaimRequest[];
  reports: AdminReport[];
  onClaimStatusChange: (
    id: string,
    status: ClaimRequest["status"],
    reason?: string,
    instructions?: string,
  ) => Promise<void>;
  onOsaReceiptChange: (id: string, receivedByOsa: boolean) => void;
  isUpdatingOsaReceipt?: boolean;
  onRemindFinder?: (id: string) => void;
  isRemindingFinder?: boolean;
  plainDetails?: boolean;
}) {
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    claimId: string;
    status: StatusDecision;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [approvalInstructions, setApprovalInstructions] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [savingStatusChange, setSavingStatusChange] = useState(false);
  const [confirmOsaReceipt, setConfirmOsaReceipt] = useState<{
    itemId: string;
    itemName: string;
    nextReceived: boolean;
  } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>(() =>
    DEFAULT_CLAIM_FILTERS.includes(claim.status) ? claim.status : "Pending",
  );
  const approvalDialogRef = useRef<HTMLDialogElement>(null);

  const selectedItemPost = reports.find(
    (report) => report.id === claim.itemId,
  );
  const sortedPostClaims = useMemo(
    () =>
      sortRequestsByPostMatch([claim, ...siblingClaims], selectedItemPost),
    [claim, siblingClaims, selectedItemPost],
  );
  const detailChipOptions = useMemo(
    () =>
      DEFAULT_CLAIM_FILTERS.map((option) => ({
        key: option,
        label: option,
        count: sortedPostClaims.filter((entry) => entry.status === option)
          .length,
      })),
    [sortedPostClaims],
  );
  const visiblePostClaims = useMemo(
    () =>
      sortedPostClaims.filter((entry) => entry.status === detailStatusFilter),
    [sortedPostClaims, detailStatusFilter],
  );

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
    claimForStatusChange && pendingStatusChange?.status === "ItemClaimed"
      ? allClaims.filter(
          (item) =>
            item.id !== claimForStatusChange.id &&
            item.itemId === claimForStatusChange.itemId &&
            item.status === "Pending",
        )
      : [];

  const closeApprovalDialog = () => {
    setPendingStatusChange(null);
    setRejectReason("");
    setRejectError("");
    setApprovalInstructions("");
    setApprovalError("");
    if (approvalDialogRef.current?.open) approvalDialogRef.current.close();
  };

  const isClaimCompletionDecision =
    pendingStatusChange?.status === "ItemClaimed";

  const confirmStatusChange = async () => {
    if (!pendingStatusChange || !claimForStatusChange || savingStatusChange) {
      return;
    }
    const trimmedReason = rejectReason.trim();
    if (pendingStatusChange.status === "Rejected" && !trimmedReason) {
      setRejectError("Please enter a reason for rejecting this claim request.");
      return;
    }
    const trimmedInstructions = approvalInstructions.trim();
    if (pendingStatusChange.status === "Approved" && !trimmedInstructions) {
      setApprovalError(
        "Please enter pickup instructions for the claimant before approving.",
      );
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
        pendingStatusChange.status === "Rejected" ? trimmedReason : undefined,
        pendingStatusChange.status === "Approved"
          ? trimmedInstructions
          : undefined,
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

      if (DEFAULT_CLAIM_FILTERS.includes(confirmedStatus)) {
        setDetailStatusFilter(confirmedStatus);
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
  const hasResolvedPostClaim =
    itemClaimed ||
    selectedItemPost?.status === "Returned" ||
    sortedPostClaims.some(
      (item) =>
        item.status === "Approved" ||
        item.status === "Claimed" ||
        item.status === "Returned",
    );
  const hasApprovedClaim = sortedPostClaims.some(
    (item) => item.status === "Approved",
  );
  const hasPendingPostClaim = sortedPostClaims.some(
    (item) => item.status === "Pending",
  );
  const cannotRevokeOsa = Boolean(itemReceived && hasResolvedPostClaim);
  const lastReminderMs = selectedItemPost?.lastFinderReminderAt
    ? new Date(selectedItemPost.lastFinderReminderAt).getTime()
    : NaN;
  const reminderCooldownRemainingMs =
    !Number.isNaN(lastReminderMs)
      ? Math.max(0, lastReminderMs + FINDER_REMINDER_COOLDOWN_MS - nowMs)
      : 0;
  const isReminderCoolingDown = reminderCooldownRemainingMs > 0;

  useEffect(() => {
    if (!isReminderCoolingDown) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [isReminderCoolingDown]);

  const postFacts = buildPostFacts(
    selectedItemPost,
    claim.item,
    unlocked,
    requestUnlock,
  );
  if (selectedItemPost?.type === "Found") {
    postFacts.push({
      id: "physical-item",
      label: "Physical item",
      value: (
        <div className="flex flex-wrap items-center gap-3">
          <OsaReceiptStatus received={selectedItemPost.receivedByOsa} />
          <button
            type="button"
            disabled={isUpdatingOsaReceipt || cannotRevokeOsa}
            title={
              cannotRevokeOsa
                ? "Cannot undo OSA receipt after a request on this item has been approved or completed."
                : undefined
            }
            onClick={() =>
              setConfirmOsaReceipt({
                itemId: selectedItemPost.id,
                itemName: selectedItemPost.title || claim.item,
                nextReceived: !selectedItemPost.receivedByOsa,
              })
            }
            className={`inline-flex h-8 items-center justify-center rounded-[10px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45 ${
              selectedItemPost.receivedByOsa
                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            }`}
          >
            {isUpdatingOsaReceipt
              ? "Updating…"
              : selectedItemPost.receivedByOsa
                ? "Mark not yet received"
                : "Mark received"}
          </button>
          {!selectedItemPost.receivedByOsa &&
            hasPendingPostClaim &&
            onRemindFinder && (
              <button
                type="button"
                disabled={isRemindingFinder || isReminderCoolingDown}
                title={
                  isReminderCoolingDown
                    ? `Reminder already sent. Available again in ${formatCooldownRemaining(reminderCooldownRemainingMs)}.`
                    : "Send a reminder to the finder to surrender this item to OSA"
                }
                onClick={() => onRemindFinder(selectedItemPost.id)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                {isRemindingFinder
                  ? "Sending…"
                  : isReminderCoolingDown
                    ? `Remind in ${formatCooldownRemaining(reminderCooldownRemainingMs)}`
                    : "Remind finder"}
              </button>
            )}
        </div>
      ),
    });
  }
  const reporterId = selectedItemPost
    ? resolveIdNumber(
        selectedItemPost.reporterSchoolId,
        selectedItemPost.reporterEmail,
      ) || "N/A"
    : "N/A";
  const reporterMeta = selectedItemPost
    ? `${isLostItem ? "Owner · " : ""}ID ${reporterId}`
    : "Original post details unavailable";

  const buildClaimFactRows = (requestItem: ClaimRequest): ReviewFactRow[] => [
    {
      id: "color",
      label: "Primary color",
      value: requestItem.color?.trim() || "None",
    },
    {
      id: "location",
      label: isLostItem ? "Location found" : "Location lost",
      value: requestItem.location || "None",
    },
    {
      id: "building",
      label: "Building",
      value: requestItem.building?.trim() || "None",
    },
    {
      id: "date",
      label: isLostItem ? "Date found" : "Date lost",
      value: requestItem.dateLost || "None",
    },
    {
      id: "time",
      label: isLostItem ? "Time found" : "Time lost",
      value: requestItem.timeLost || "None",
    },
    {
      id: "important-details",
      label: "Important details",
      value: (
        <LockedValue
          value={requestItem.importantDetails}
          unlocked={unlocked}
          onUnlock={requestUnlock}
        />
      ),
      note: unlocked
        ? undefined
        : "Protected detail. Enter your staff or admin password to reveal.",
    },
    ...(requestItem.releasedBy
      ? [
          {
            id: "released-by",
            label: "Released by",
            value: (
              <span>
                {requestItem.releasedBy.name}
                <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                  ({requestItem.releasedBy.role === "admin" ? "Admin" : "Staff"}
                  {requestItem.releasedAt
                    ? ` · ${new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(requestItem.releasedAt))}`
                    : ""}
                  )
                </span>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="overflow-x-clip">
      {pendingStatusChange && claimForStatusChange && (
        <dialog
          ref={approvalDialogRef}
          aria-labelledby="claim-status-title"
          aria-describedby={
            pendingStatusChange.status === "Rejected"
              ? undefined
              : "claim-status-description"
          }
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
            {pendingStatusChange.status !== "Rejected" && (
              <p
                id="claim-status-description"
                className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
              >
                {pendingStatusChange.status === "Approved"
                  ? `Are you sure you want to approve ${claimForStatusChange.claimant}'s claim for ${claimForStatusChange.item}?`
                  : pendingStatusChange.status === "ItemClaimed"
                    ? `Has ${claimForStatusChange.claimant} already claimed the ${claimForStatusChange.item}?`
                    : `Confirm that ${claimForStatusChange.claimant} has received ${claimForStatusChange.item}.`}
              </p>
            )}
            {pendingStatusChange.status === "Approved" && (
              <div className="mt-4">
                <label
                  htmlFor="claim-approval-instructions"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Approval instructions <span className="text-[#E5192D]">*</span>
                </label>
                <textarea
                  id="claim-approval-instructions"
                  rows={3}
                  maxLength={500}
                  required
                  value={approvalInstructions}
                  onChange={(event) => {
                    setApprovalInstructions(event.target.value);
                    if (approvalError) setApprovalError("");
                  }}
                  placeholder="Enter pickup instructions (e.g., bring your school ID to OSA Window 2, Mon–Fri 8 AM–5 PM)…"
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                {approvalError && (
                  <p className="mt-1.5 text-xs font-medium text-[#E5192D]" role="alert">
                    {approvalError}
                  </p>
                )}
              </div>
            )}
            {isClaimCompletionDecision && claimsToAutoReject.length > 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                {claimsToAutoReject.length === 1
                  ? "1 other pending claim for this item will be automatically rejected once marked as claimed."
                  : `${claimsToAutoReject.length} other pending claims for this item will be automatically rejected once marked as claimed.`}
              </p>
            )}
            {pendingStatusChange.status === "Rejected" && (
              <div className="mt-4">
                <label
                  htmlFor="claim-reject-reason"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Rejection reason <span className="text-[#E5192D]">*</span>
                </label>
                <textarea
                  id="claim-reject-reason"
                  rows={3}
                  maxLength={500}
                  required
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    if (rejectError) setRejectError("");
                  }}
                  placeholder="Explain why this claim request is being rejected…"
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                {rejectError && (
                  <p className="mt-1.5 text-xs font-medium text-[#E5192D]" role="alert">
                    {rejectError}
                  </p>
                )}
              </div>
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
                disabled={
                  savingStatusChange ||
                  (pendingStatusChange.status === "Rejected" &&
                    !rejectReason.trim()) ||
                  (pendingStatusChange.status === "Approved" &&
                    !approvalInstructions.trim())
                }
                className="h-9 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      <FadeIn>
      <OriginalPostCard
        layout="horizontal"
        itemTitle={selectedItemPost?.title || claim.item}
        reportTypeLabel={
          isLostItem ? "Lost item report" : "Found item report"
        }
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
      />
      </FadeIn>

      <FadeIn delay={0.06}>
      <div className="mt-8 space-y-4">
        <section aria-labelledby="claim-requests-list-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="claim-requests-list-heading"
              className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {visiblePostClaims.length === 1
                ? "Claim request"
                : "Claim requests"}{" "}
              <span className="font-mono text-sm font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
                {visiblePostClaims.length}
              </span>
            </h2>
            <FilterChips
              options={detailChipOptions}
              value={detailStatusFilter}
              onChange={setDetailStatusFilter}
              ariaLabel="Filter claim requests by status"
            />
          </div>
        </section>

        {visiblePostClaims.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            No {detailStatusFilter.toLowerCase()} claim requests for this post.
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePostClaims.map((requestItem) => {
              const hasAnotherApprovedClaim =
                hasApprovedClaim && requestItem.status !== "Approved";
              return (
                <SubmittedRequestCard
                  key={requestItem.id}
                  requestKey={requestItem.id}
                  requestTypeLabel="Claim Request"
                  submitted={requestItem.submitted}
                  itemTitle={
                    requestItem.claimantTitle?.trim() || requestItem.item
                  }
                  applicantName={requestItem.claimant}
                  applicantId={
                    resolveIdNumber(
                      requestItem.schoolId,
                      getClaimantEmail(requestItem),
                    ) || "N/A"
                  }
                  status={requestItem.status}
                  photos={(requestItem.evidence ?? []).map((image, index) => ({
                    src: image,
                    alt: `Photo evidence ${index + 1} submitted by ${requestItem.claimant}`,
                  }))}
                  emptyPhotoSubtitle=""
                  notices={
                    <>
                      {!isLostItem &&
                        requestItem.status === "Pending" &&
                        !itemReceived && (
                          <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            Approval is unavailable until the physical item is
                            received by OSA.
                          </div>
                        )}
                      {requestItem.status === "Approved" &&
                        requestItem.approvalInstructions?.trim() && (
                          <div className="mt-4 rounded-xl bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                            <p className="font-semibold">
                              Pickup instructions sent to claimant
                            </p>
                            <p className="mt-1 whitespace-pre-line break-words leading-relaxed">
                              {requestItem.approvalInstructions}
                            </p>
                          </div>
                        )}
                    </>
                  }
                  description={requestItem.details}
                  facts={buildClaimFactRows(requestItem)}
                  actions={
                    requestItem.status !== "Claimed" &&
                    requestItem.status !== "Rejected" ? (
                      <>
                        <button
                          type="button"
                          disabled={
                            requestItem.status !== "Pending" &&
                            requestItem.status !== "Approved"
                          }
                          onClick={() => {
                            setRejectReason("");
                            setRejectError("");
                            setPendingStatusChange({
                              claimId: requestItem.id,
                              status: "Rejected",
                            });
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={
                            requestItem.status === "Returned" ||
                            (!isLostItem &&
                              requestItem.status !== "Approved" &&
                              !itemReceived) ||
                            (!isLostItem &&
                              requestItem.status === "Pending" &&
                              hasAnotherApprovedClaim) ||
                            (!isLostItem &&
                              itemClaimed &&
                              requestItem.status !== "Approved")
                          }
                          title={
                            !isLostItem &&
                            requestItem.status === "Pending" &&
                            !itemReceived
                              ? "Item must be received by OSA before approving"
                              : !isLostItem &&
                                  requestItem.status === "Pending" &&
                                  hasAnotherApprovedClaim
                                ? "Another claim is currently approved. Reject it first before approving another."
                                : undefined
                          }
                          onClick={() =>
                            setPendingStatusChange({
                              claimId: requestItem.id,
                              status:
                                !isLostItem && requestItem.status === "Approved"
                                  ? "ItemClaimed"
                                  : isLostItem
                                    ? "Returned"
                                    : "Approved",
                            })
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          {requestItem.status === "Returned"
                            ? "Returned"
                            : requestItem.status === "Approved" && !isLostItem
                              ? "Mark as claimed"
                              : isLostItem
                                ? "Mark as returned"
                                : "Approve request"}
                        </button>
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
      </FadeIn>

      <OsaReceiptConfirmModal
        open={Boolean(confirmOsaReceipt)}
        itemName={confirmOsaReceipt?.itemName ?? ""}
        nextReceived={confirmOsaReceipt?.nextReceived ?? true}
        context="claim"
        isUpdating={isUpdatingOsaReceipt}
        onCancel={() => setConfirmOsaReceipt(null)}
        onConfirm={() => {
          if (!confirmOsaReceipt) return;
          onOsaReceiptChange(
            confirmOsaReceipt.itemId,
            confirmOsaReceipt.nextReceived,
          );
          setConfirmOsaReceipt(null);
        }}
      />

      <AdminPasswordModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSubmit={submitPassword}
      />
    </div>
  );
}

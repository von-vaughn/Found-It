import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bell, Check, ChevronRight, Send, X } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { NoItemImage } from "@/components/NoItemImage";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { resolveIdNumber } from "@/lib/idNumber";
import type { ServerClaimStatus } from "@/services/claimService";
import type { ClaimRequest } from "@/types/claim";
import { OsaReceiptConfirmModal } from "./OsaReceiptConfirmModal";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import {
  FilterChips,
  OriginalPostCard,
  ReviewPager,
  SubmittedRequestCard,
  type ReviewFactRow,
} from "./ReviewLayout";
import { AdminPasswordModal, LockedValue } from "./SensitiveDetails";
import { StatusBadge } from "./StatusBadge";
import type { AdminReport } from "./types";
import {
  formatAdminEventDate,
  formatAdminEventTime,
  sortRequestsByPostMatch,
} from "./requestComparison";
import { useSensitiveUnlock } from "./useSensitiveUnlock";

const LIST_PAGE_SIZE = 10;

const DEFAULT_RETURN_FILTERS = [
  "Pending",
  "Approved",
  "Returned",
  "Rejected",
];

const ADMIN_RETURN_STATUS: Partial<
  Record<ClaimRequest["status"], Exclude<ServerClaimStatus, "pending" | "claimed">>
> = {
  Approved: "approved",
  Rejected: "rejected",
  Returned: "returned",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "None"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

type StatusDecision = "Approved" | "Rejected" | "Returned";

function buildLostPostFacts(
  report: AdminReport | undefined,
  fallbackTitle: string,
  unlocked: boolean,
  onUnlock: () => void,
): ReviewFactRow[] {
  if (!report) return [];
  return [
    {
      id: "item-name",
      label: "Item name",
      value: report.title || fallbackTitle || "Not provided",
    },
    {
      id: "color",
      label: "Primary color",
      value: report.color?.trim() || "Not provided",
    },
    {
      id: "location-lost",
      label: "Specific location",
      value: report.specificLocation?.trim() || "Not provided",
    },
    {
      id: "building",
      label: "Building",
      value: report.buildingName?.trim() || "Not provided",
    },
    {
      id: "date-lost",
      label: "Date lost",
      value: formatAdminEventDate(report.eventDateTime),
    },
    {
      id: "time-lost",
      label: "Time lost",
      value: formatAdminEventTime(report.eventDateTime),
    },
    {
      id: "category",
      label: "Category",
      value: report.category || "Not provided",
    },
    {
      id: "important-details",
      label: "Important details",
      value: (
        <LockedValue
          value={report.confidentialInfo}
          unlocked={unlocked}
          onUnlock={onUnlock}
        />
      ),
    },
  ];
}

/** Full-page list of return requests submitted on lost-item reports. */
export function ReturnsListPanel({
  visibleRequests,
  reports,
  query,
  onSelectReturn,
}: {
  visibleRequests: ClaimRequest[];
  reports: AdminReport[];
  query: string;
  onSelectReturn: (id: string) => void;
}) {
  const [page, setPage] = useState(1);

  const queryMatchedRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleRequests.filter((request) =>
      [
        request.item,
        request.claimant,
        request.location,
        request.details,
        request.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, visibleRequests]);

  const groupRequests = (items: ClaimRequest[]) => {
    const groups = new Map<string, ClaimRequest[]>();
    for (const request of items) {
      const group = groups.get(request.itemId) ?? [];
      group.push(request);
      groups.set(request.itemId, group);
    }
    return Array.from(groups.values()).map((requests) => ({
      representative: requests[0],
      requests,
    }));
  };

  const requestGroups = useMemo(
    () => groupRequests(queryMatchedRequests),
    [queryMatchedRequests],
  );

  const [prevListKey, setPrevListKey] = useState({
    query: "",
    total: -1,
  });
  if (
    query !== prevListKey.query ||
    visibleRequests.length !== prevListKey.total
  ) {
    setPrevListKey({ query, total: visibleRequests.length });
    setPage(1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(requestGroups.length / LIST_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageGroups = requestGroups.slice(
    (safePage - 1) * LIST_PAGE_SIZE,
    safePage * LIST_PAGE_SIZE,
  );
  const rangeStart =
    requestGroups.length === 0 ? 0 : (safePage - 1) * LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * LIST_PAGE_SIZE, requestGroups.length);

  return (
    <section aria-labelledby="returns-list-heading" className="space-y-5">
      <FadeIn>
      <div>
        <h1
          id="returns-list-heading"
          className="flex items-center gap-2.5 text-2xl font-semibold tracking-[-0.02em] text-neutral-900 dark:text-neutral-100"
        >
          <span>Return Item</span>
          <span className="font-mono text-base font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
            {requestGroups.length}
          </span>
        </h1>
      </div>
      </FadeIn>

      {requestGroups.length === 0 ? (
        <FadeIn delay={0.05}>
        <div className="rounded-[14px] border border-dashed border-neutral-300 bg-white px-5 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          No return requests yet.
        </div>
        </FadeIn>
      ) : (
        <>
          <StaggerGrid
            key={`${safePage}-${requestGroups.length}-${pageGroups[0]?.representative.itemId ?? ""}`}
            className="grid gap-2.5"
          >
            {pageGroups.map((group) => {
              const request = group.representative;
              const lostReport = reports.find(
                (report) => report.id === request.itemId,
              );
              const preview = lostReport?.image || request.evidence?.[0] || "";
              const finderNames = group.requests
                .map((entry) => entry.claimant)
                .filter((name, index, names) => names.indexOf(name) === index);
              return (
                <StaggerItem key={request.itemId}>
                <button
                  type="button"
                  onClick={() => onSelectReturn(request.id)}
                  className="flex w-full items-center gap-3.5 rounded-[14px] bg-white px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 dark:hover:bg-neutral-800/70"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt={`${request.item} evidence`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-[10px] object-cover"
                    />
                  ) : (
                    <NoItemImage compact className="h-12 w-12 rounded-[10px]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {request.item}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="truncate">{finderNames.join(", ")}</span>
                      {group.requests.length > 1 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-500/10 dark:text-blue-400">
                          {group.requests.length} requests
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="flex flex-col items-end gap-1">
                      <StatusBadge status={request.status} />
                      <span className="hidden text-[10px] uppercase tracking-[0.06em] text-neutral-500 sm:block dark:text-neutral-400">
                        Submitted {request.submitted}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-neutral-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                  </span>
                </button>
                </StaggerItem>
              );
            })}
          </StaggerGrid>

          <FadeIn delay={0.08}>
          <ReviewPager
            page={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={requestGroups.length}
            itemUnitLabel="posts"
            showRange={false}
            onPageChange={setPage}
          />
          </FadeIn>
        </>
      )}
    </section>
  );
}

/** Detail and review panel for all return requests submitted on a lost item post. */
export function ReturnDetailPanel({
  request: selectedRequest,
  siblingRequests = [],
  allRequests,
  reports,
  physicalItemReceived,
  onUpdateStatus,
  onUpdateOsaReceipt,
  isUpdatingOsaReceipt,
  updatingOsaId,
  onPublishRejected,
  isPublishing,
  publishingId,
  onRemindFinder,
  isRemindingFinder,
  remindingReturnId,
}: {
  request: ClaimRequest;
  siblingRequests?: ClaimRequest[];
  allRequests: ClaimRequest[];
  reports: AdminReport[];
  physicalItemReceived: (request: ClaimRequest) => boolean;
  onUpdateStatus: (
    id: string,
    status: Exclude<ServerClaimStatus, "pending" | "claimed">,
    instructions?: string,
  ) => Promise<unknown>;
  onUpdateOsaReceipt: (
    params: { id: string; receivedByOsa: boolean },
    options: { onSuccess: () => void; onError: () => void },
  ) => void;
  isUpdatingOsaReceipt: boolean;
  updatingOsaId?: string;
  onPublishRejected: (
    id: string,
    options: {
      onSuccess: (result: { alreadyPublished: boolean }) => void;
      onError: (error: unknown) => void;
    },
  ) => void;
  isPublishing: boolean;
  publishingId?: string;
  onRemindFinder?: (id: string) => void;
  isRemindingFinder?: boolean;
  remindingReturnId?: string;
}) {
  const [confirmAction, setConfirmAction] = useState<{
    requestId: string;
    status: StatusDecision;
  } | null>(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [approvalMessageError, setApprovalMessageError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>(() =>
    DEFAULT_RETURN_FILTERS.includes(selectedRequest.status)
      ? selectedRequest.status
      : "Pending",
  );
  const [confirmPublishRequest, setConfirmPublishRequest] =
    useState<ClaimRequest | null>(null);
  const [confirmOsaReceipt, setConfirmOsaReceipt] = useState<{
    requestId: string;
    itemName: string;
    nextReceived: boolean;
  } | null>(null);

  const selectedLostReport = reports.find(
    (report) => report.id === selectedRequest.itemId,
  );

  const postRequests = useMemo(() => {
    const seen = new Set<string>();
    const combined: ClaimRequest[] = [];
    for (const entry of [selectedRequest, ...siblingRequests]) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      combined.push(entry);
    }
    return sortRequestsByPostMatch(combined, selectedLostReport);
  }, [selectedRequest, siblingRequests, selectedLostReport]);

  const detailChipOptions = useMemo(
    () =>
      DEFAULT_RETURN_FILTERS.map((option) => ({
        key: option,
        label: option,
        count: postRequests.filter((entry) => entry.status === option).length,
      })),
    [postRequests],
  );
  const visiblePostRequests = useMemo(
    () => postRequests.filter((entry) => entry.status === detailStatusFilter),
    [postRequests, detailStatusFilter],
  );

  const confirmTargetRequest = confirmAction
    ? (allRequests.find((item) => item.id === confirmAction.requestId) ?? null)
    : null;
  const requestsToAutoReject =
    confirmTargetRequest && confirmAction?.status === "Returned"
      ? allRequests.filter(
          (item) =>
            item.id !== confirmTargetRequest.id &&
            item.itemId === confirmTargetRequest.itemId &&
            item.status === "Pending",
        )
      : [];
  const isCompleteReturn = confirmAction?.status === "Returned";
  const hasApprovedReturn = postRequests.some(
    (entry) => entry.status === "Approved",
  );

  const { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen } =
    useSensitiveUnlock();

  const requestStatusChange = (requestId: string, status: StatusDecision) => {
    const target = allRequests.find((item) => item.id === requestId);
    if (!target) return;
    if (status === "Returned") {
      if (target.status !== "Approved") return;
    } else if (status === "Rejected") {
      if (target.status !== "Pending" && target.status !== "Approved") return;
    } else if (target.status !== "Pending") return;
    setApprovalMessage("");
    setApprovalMessageError("");
    setConfirmAction({ requestId, status });
  };

  const confirmPublishRejectedReturn = () => {
    if (!confirmPublishRequest) return;
    const target = confirmPublishRequest;
    onPublishRejected(target.id, {
      onSuccess: (result) => {
        setConfirmPublishRequest(null);
        if (result.alreadyPublished) {
          toast.success(
            "This return request was already posted as a found item.",
          );
          return;
        }
        toast.success(
          `Posted "${target.claimantTitle || target.item}" as a found item.`,
        );
      },
      onError: (error) => {
        const responseMessage = (
          error as { response?: { data?: { message?: string } } }
        )?.response?.data?.message;
        toast.error(
          responseMessage ||
            "Could not post this found item. Please try again.",
        );
      },
    });
  };

  const handleOsaReceiptChange = (
    requestId: string,
    receivedByOsa: boolean,
  ) => {
    onUpdateOsaReceipt(
      { id: requestId, receivedByOsa },
      {
        onSuccess: () => {
          toast.success(
            receivedByOsa
              ? "Item marked received by OSA."
              : "Item marked not yet received.",
          );
        },
        onError: () => {
          toast.error(
            "Could not update the physical item status. Please try again.",
          );
        },
      },
    );
  };

  const confirmStatusChange = async () => {
    if (!confirmAction || !confirmTargetRequest) return;
    const serverStatus = ADMIN_RETURN_STATUS[confirmAction.status];
    if (!serverStatus) return;

    const trimmedMessage = approvalMessage.trim();
    if (confirmAction.status === "Approved" && !trimmedMessage) {
      setApprovalMessageError(
        "Please enter a message for the lost-item owner before approving.",
      );
      return;
    }

    const wasApprovedBeforeReject =
      confirmAction.status === "Rejected" &&
      confirmTargetRequest.status === "Approved";

    try {
      await onUpdateStatus(
        confirmAction.requestId,
        serverStatus,
        confirmAction.status === "Approved" ? trimmedMessage : undefined,
      );
    } catch {
      toast.error("Could not update this return request. Please try again.");
      return;
    }

    if (confirmAction.status === "Approved") {
      toast.success(
        `Approved return of "${confirmTargetRequest.item}" and notified the lost-item owner.`,
      );
    } else if (confirmAction.status === "Returned") {
      toast.success(
        `Marked "${confirmTargetRequest.item}" as returned to ${confirmTargetRequest.claimant}.`,
      );
    } else if (wasApprovedBeforeReject) {
      toast.success(
        `Rejected return request for "${confirmTargetRequest.item}" and posted it as a public found item.`,
      );
    } else {
      toast.success(
        `Rejected return request for "${confirmTargetRequest.item}".`,
      );
    }
    if (DEFAULT_RETURN_FILTERS.includes(confirmAction.status)) {
      setDetailStatusFilter(confirmAction.status);
    }
    setApprovalMessage("");
    setApprovalMessageError("");
    setConfirmAction(null);
  };

  useEffect(() => {
    if (!confirmAction && !confirmPublishRequest) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmAction(null);
        setConfirmPublishRequest(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmAction, confirmPublishRequest]);

  const postFacts = buildLostPostFacts(
    selectedLostReport,
    selectedRequest.item,
    unlocked,
    requestUnlock,
  );
  const ownerId = selectedLostReport
    ? resolveIdNumber(
        selectedLostReport.reporterSchoolId,
        selectedLostReport.reporterEmail,
      ) || "N/A"
    : "N/A";
  const ownerMeta = selectedLostReport
    ? `Owner · ID ${ownerId}`
    : "Original post details unavailable";

  const hasActiveReminderCooldown = postRequests.some((entry) => {
    if (!entry.lastFinderReminderAt) return false;
    const lastMs = new Date(entry.lastFinderReminderAt).getTime();
    return !Number.isNaN(lastMs) && lastMs + 3 * 60 * 60 * 1000 > nowMs;
  });

  useEffect(() => {
    if (!hasActiveReminderCooldown) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [hasActiveReminderCooldown]);

  const buildReturnFactRows = (entry: ClaimRequest): ReviewFactRow[] => {
    const entryReceived = physicalItemReceived(entry);
    const updatingEntryOsa = Boolean(
      isUpdatingOsaReceipt && updatingOsaId === entry.id,
    );
    const remindingThisEntry = Boolean(
      isRemindingFinder && remindingReturnId === entry.id,
    );
    const lastReminderMs = entry.lastFinderReminderAt
      ? new Date(entry.lastFinderReminderAt).getTime()
      : NaN;
    const reminderCooldownMs = !Number.isNaN(lastReminderMs)
      ? Math.max(0, lastReminderMs + 3 * 60 * 60 * 1000 - nowMs)
      : 0;
    const reminderCooldownLabel =
      reminderCooldownMs > 0
        ? (() => {
            const totalMinutes = Math.ceil(reminderCooldownMs / 60_000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return hours > 0
              ? `Reminded (${hours}h ${minutes}m)`
              : `Reminded (${minutes}m)`;
          })()
        : null;
    return [
      {
        id: "color",
        label: "Primary color",
        value: entry.color?.trim() || "None",
      },
      {
        id: "location-found",
        label: "Location found",
        value: entry.location || "None",
      },
      {
        id: "building",
        label: "Building",
        value: entry.building?.trim() || "None",
      },
      {
        id: "date-found",
        label: "Date found",
        value: formatDate(entry.dateLost),
      },
      {
        id: "time-found",
        label: "Time found",
        value: entry.timeLost || "None",
      },
      {
        id: "physical-item",
        label: "Physical item",
        value: (
          <div className="flex flex-wrap items-center gap-3">
            <OsaReceiptStatus received={entryReceived} />
            {(entry.status === "Pending" ||
              (entry.status === "Rejected" && !entry.publishedItemId)) && (
              <button
                type="button"
                disabled={updatingEntryOsa}
                onClick={() =>
                  setConfirmOsaReceipt({
                    requestId: entry.id,
                    itemName: entry.claimantTitle?.trim() || entry.item,
                    nextReceived: !(entry.receivedByOsa ?? false),
                  })
                }
                className={`inline-flex h-8 items-center justify-center rounded-[10px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-50 ${
                  entry.receivedByOsa
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                }`}
              >
                {updatingEntryOsa
                  ? "Updating…"
                  : entry.receivedByOsa
                    ? "Mark not yet received"
                    : "Mark received"}
              </button>
            )}
            {entry.status === "Pending" &&
              !entryReceived &&
              onRemindFinder && (
                <button
                  type="button"
                  disabled={remindingThisEntry || Boolean(reminderCooldownLabel)}
                  onClick={() => onRemindFinder(entry.id)}
                  title={
                    reminderCooldownLabel
                      ? "Surrender reminder can be sent once every 3 hours"
                      : "Send a notification reminding the finder to surrender this item to OSA"
                  }
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-55 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  {remindingThisEntry
                    ? "Sending…"
                    : (reminderCooldownLabel ?? "Remind finder")}
                </button>
              )}
          </div>
        ),
      },
      {
        id: "important-details",
        label: "Important details",
        value: (
          <LockedValue
            value={entry.importantDetails}
            unlocked={unlocked}
            onUnlock={requestUnlock}
          />
        ),
        note: unlocked
          ? undefined
          : "Protected detail. Enter your staff or admin password to reveal.",
      },
    ];
  };

  return (
    <>
      <FadeIn>
      <OriginalPostCard
        layout="horizontal"
        itemTitle={selectedLostReport?.title || selectedRequest.item}
        reportTypeLabel="Lost item report"
        postedDateLabel={
          selectedLostReport?.date
            ? `Posted ${selectedLostReport.date}`
            : "Original post"
        }
        image={selectedLostReport?.image}
        imageAlt={`${selectedRequest.item} item`}
        reporterName={selectedLostReport?.reportedBy || "Unavailable"}
        reporterMeta={ownerMeta}
        facts={postFacts}
        notes={selectedLostReport?.description}
      />
      </FadeIn>

      <FadeIn delay={0.06}>
      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {visiblePostRequests.length === 1
              ? "Return request"
              : "Return requests"}{" "}
            <span className="font-mono text-sm font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
              {visiblePostRequests.length}
            </span>
          </h2>
          <FilterChips
            options={detailChipOptions}
            value={detailStatusFilter}
            onChange={setDetailStatusFilter}
            ariaLabel="Filter return requests by status"
          />
        </div>
        {visiblePostRequests.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            No {detailStatusFilter.toLowerCase()} return requests for this post.
          </div>
        ) : (
        <div className="space-y-4">
          {visiblePostRequests.map((entry) => {
            const publishingEntry = Boolean(
              isPublishing && publishingId === entry.id,
            );
            const entryReceived = physicalItemReceived(entry);
            const hasAnotherApprovedReturn =
              hasApprovedReturn && entry.status !== "Approved";
            return (
              <SubmittedRequestCard
                key={entry.id}
                requestKey={entry.id}
                requestTypeLabel="Return Request"
                submitted={entry.submitted}
                itemTitle={entry.claimantTitle?.trim() || entry.item}
                applicantName={entry.claimant}
                applicantId={
                  resolveIdNumber(entry.schoolId, entry.email) || "N/A"
                }
                status={entry.status}
                photos={(entry.evidence ?? []).map((image, index) => ({
                  src: image,
                  alt: `Evidence ${index + 1} from ${entry.claimant}`,
                }))}
                emptyPhotoSubtitle="The finder did not attach any photos to this request."
                notices={
                  <>
                    {entry.status === "Pending" && !entry.receivedByOsa && (
                      <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                        Approval is unavailable until the physical item is
                        received by OSA.
                      </div>
                    )}

                    {entry.status === "Approved" &&
                      entry.approvalInstructions?.trim() && (
                        <div className="mt-4 rounded-xl bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                          <p className="font-semibold">
                            Message sent to lost-item owner
                          </p>
                          <p className="mt-1 whitespace-pre-line break-words leading-relaxed">
                            {entry.approvalInstructions}
                          </p>
                        </div>
                      )}

                    {entry.status === "Rejected" &&
                      !entry.publishedItemId &&
                      !entryReceived && (
                        <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                          Mark the physical item as received by OSA before
                          posting it as a public found item.
                        </div>
                      )}

                    {entry.status === "Rejected" && entry.publishedItemId && (
                      <div className="mt-4 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                        This found-item post is already available in the public
                        listings.
                      </div>
                    )}
                  </>
                }
                description={entry.details}
                facts={buildReturnFactRows(entry)}
                actions={
                  entry.status === "Pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          requestStatusChange(entry.id, "Rejected")
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={!entry.receivedByOsa || hasAnotherApprovedReturn}
                        title={
                          !entry.receivedByOsa
                            ? "Item must be received by OSA before approving"
                            : hasAnotherApprovedReturn
                              ? "Another return request is currently approved. Reject it first before approving another."
                              : undefined
                        }
                        onClick={() =>
                          requestStatusChange(entry.id, "Approved")
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Approve
                      </button>
                    </>
                  ) : entry.status === "Approved" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          requestStatusChange(entry.id, "Rejected")
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestStatusChange(entry.id, "Returned")
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark as returned
                      </button>
                    </>
                  ) : entry.status === "Rejected" ? (
                    <button
                      type="button"
                      onClick={() => setConfirmPublishRequest(entry)}
                      disabled={
                        Boolean(entry.publishedItemId) ||
                        publishingEntry ||
                        !entryReceived
                      }
                      title={
                        !entryReceived && !entry.publishedItemId
                          ? "Physical item must be marked received by OSA before publishing"
                          : undefined
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      {entry.publishedItemId
                        ? "Posted as found item"
                        : publishingEntry
                          ? "Posting item…"
                          : "Post as found item"}
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
        )}
      </div>
      </FadeIn>

      {confirmAction && confirmTargetRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden="true"
            onClick={() => setConfirmAction(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              aria-label="Close confirmation"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2
              id="return-confirm-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {confirmAction.status === "Approved"
                ? "Approve this return?"
                : confirmAction.status === "Returned"
                  ? "Mark item as returned?"
                  : confirmTargetRequest.status === "Approved"
                    ? "Reject this approved return?"
                    : "Reject this return?"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {confirmAction.status === "Approved"
                ? `"${confirmTargetRequest.item}" should only be approved after it has been turned over to the OSA office.`
                : confirmAction.status === "Returned"
                  ? `"${confirmTargetRequest.item}" will be marked as returned to ${confirmTargetRequest.claimant}. Its item report will show Returned.`
                  : confirmTargetRequest.status === "Approved"
                    ? `The approved return for "${confirmTargetRequest.item}" by ${confirmTargetRequest.claimant} will be marked as rejected. The lost-item owner will be notified, and this item will be automatically posted as a public found item.`
                    : `The return request for "${confirmTargetRequest.item}" by ${confirmTargetRequest.claimant} will be marked as rejected.`}
            </p>
            {confirmAction.status === "Approved" && (
              <div className="mt-4">
                <label
                  htmlFor="return-approval-message"
                  className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Message for the lost-item owner{" "}
                  <span className="text-[#E5192D]" aria-hidden="true">
                    *
                  </span>
                </label>
                <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Sent only to the user who posted this lost item, not the finder.
                </p>
                <textarea
                  id="return-approval-message"
                  rows={3}
                  maxLength={500}
                  value={approvalMessage}
                  onChange={(event) => {
                    setApprovalMessage(event.target.value);
                    if (approvalMessageError) setApprovalMessageError("");
                  }}
                  placeholder="e.g., Visit OSA Window 1 with your student ID to verify and claim your item."
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-900"
                />
                {approvalMessageError && (
                  <p
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#E5192D] dark:text-red-400"
                  >
                    {approvalMessageError}
                  </p>
                )}
              </div>
            )}

            {isCompleteReturn && requestsToAutoReject.length > 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                {requestsToAutoReject.length === 1
                  ? "1 other pending return request for this item will be automatically rejected and posted as a public found item."
                  : `${requestsToAutoReject.length} other pending return requests for this item will be automatically rejected and posted as public found items.`}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus={confirmAction.status !== "Approved"}
                onClick={() => setConfirmAction(null)}
                className="h-10 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  confirmAction.status === "Approved" && !approvalMessage.trim()
                }
                onClick={confirmStatusChange}
                className={`h-10 rounded-xl px-5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                  confirmAction.status === "Returned"
                    ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700"
                    : "bg-[#E5192D] hover:bg-[#c91424] focus-visible:ring-[#E5192D]"
                }`}
              >
                {confirmAction.status === "Approved"
                  ? "Approve return"
                  : confirmAction.status === "Returned"
                    ? "Mark as returned"
                    : confirmTargetRequest.status === "Approved"
                      ? "Reject & post item"
                      : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPublishRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-return-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden="true"
            onClick={() => setConfirmPublishRequest(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setConfirmPublishRequest(null)}
              aria-label="Close confirmation"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2
              id="publish-return-confirm-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Post this found item?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              “
              {confirmPublishRequest.claimantTitle || confirmPublishRequest.item}
              ” will be added to the public found-items list with its report
              details and photos.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                disabled={isPublishing}
                onClick={() => setConfirmPublishRequest(null)}
                className="h-10 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={confirmPublishRejectedReturn}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {isPublishing ? "Posting…" : "Post found item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <OsaReceiptConfirmModal
        open={Boolean(confirmOsaReceipt)}
        itemName={confirmOsaReceipt?.itemName ?? ""}
        nextReceived={confirmOsaReceipt?.nextReceived ?? true}
        context="return"
        isUpdating={Boolean(
          isUpdatingOsaReceipt &&
            confirmOsaReceipt &&
            updatingOsaId === confirmOsaReceipt.requestId,
        )}
        onCancel={() => setConfirmOsaReceipt(null)}
        onConfirm={() => {
          if (!confirmOsaReceipt) return;
          handleOsaReceiptChange(
            confirmOsaReceipt.requestId,
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
    </>
  );
}

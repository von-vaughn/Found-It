import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Lock,
  MapPin,
  Package,
  Palette,
  Send,
  Tag,
  X,
} from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";
import { resolveIdNumber } from "@/lib/idNumber";
import type { ServerClaimStatus } from "@/services/claimService";
import type { ClaimRequest } from "@/types/claim";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import {
  FilterChips,
  OriginalPostCard,
  ReviewPager,
  type ReviewFactRow,
} from "./ReviewLayout";
import { AdminPasswordModal, LockedValue } from "./SensitiveDetails";
import { StatusBadge } from "./StatusBadge";
import type { AdminReport } from "./types";
import {
  compareRequestWithPost,
  formatAdminEventDate,
  formatAdminEventTime,
} from "./requestComparison";
import { useSensitiveUnlock } from "./useSensitiveUnlock";

const LIST_PAGE_SIZE = 10;

const DEFAULT_RETURN_FILTERS = [
  "All",
  "Pending",
  "Approved",
  "Returned",
  "Rejected",
];

const ADMIN_RETURN_STATUS: Partial<
  Record<ClaimRequest["status"], Exclude<ServerClaimStatus, "claimed">>
> = {
  Pending: "pending",
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

type StatusDecision = "Approved" | "Rejected" | "Pending" | "Returned";

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
      icon: Tag,
      label: "Item name",
      value: report.title || fallbackTitle || "Not provided",
    },
    {
      id: "color",
      icon: Palette,
      label: "Primary color",
      value: report.color?.trim() || "Not provided",
    },
    {
      id: "location-lost",
      icon: MapPin,
      label: "Specific location",
      value: report.specificLocation?.trim() || "Not provided",
    },
    {
      id: "building",
      icon: Building2,
      label: "Building",
      value: report.buildingName?.trim() || "Not provided",
    },
    {
      id: "date-lost",
      icon: CalendarDays,
      label: "Date lost",
      value: formatAdminEventDate(report.eventDateTime),
    },
    {
      id: "time-lost",
      icon: Clock3,
      label: "Time lost",
      value: formatAdminEventTime(report.eventDateTime),
    },
    {
      id: "category",
      icon: Tag,
      label: "Category",
      value: report.category || "Not provided",
    },
    {
      id: "important-details",
      icon: Lock,
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
  statusFilter,
  onStatusFilterChange,
  onSelectReturn,
}: {
  visibleRequests: ClaimRequest[];
  reports: AdminReport[];
  query: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
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

  const chipOptions = useMemo(
    () =>
      DEFAULT_RETURN_FILTERS.map((option) => ({
        key: option,
        label: option,
        count:
          option === "All"
            ? queryMatchedRequests.length
            : queryMatchedRequests.filter(
                (request) => request.status === option,
              ).length,
      })),
    [queryMatchedRequests],
  );

  const filteredRequests = useMemo(
    () =>
      statusFilter === "All"
        ? queryMatchedRequests
        : queryMatchedRequests.filter(
            (request) => request.status === statusFilter,
          ),
    [queryMatchedRequests, statusFilter],
  );

  const requestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of visibleRequests) {
      counts.set(request.itemId, (counts.get(request.itemId) ?? 0) + 1);
    }
    return counts;
  }, [visibleRequests]);

  const [prevListKey, setPrevListKey] = useState({
    query: "",
    statusFilter: "",
    total: -1,
  });
  if (
    query !== prevListKey.query ||
    statusFilter !== prevListKey.statusFilter ||
    visibleRequests.length !== prevListKey.total
  ) {
    setPrevListKey({ query, statusFilter, total: visibleRequests.length });
    setPage(1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / LIST_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * LIST_PAGE_SIZE,
    safePage * LIST_PAGE_SIZE,
  );
  const rangeStart =
    filteredRequests.length === 0 ? 0 : (safePage - 1) * LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * LIST_PAGE_SIZE, filteredRequests.length);

  return (
    <section aria-labelledby="returns-list-heading" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="returns-list-heading"
            className="flex items-center gap-2.5 text-2xl font-semibold tracking-[-0.02em] text-neutral-900 dark:text-neutral-100"
          >
            <span>Return Item</span>
            <span className="font-mono text-base font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
              {filteredRequests.length}
            </span>
          </h1>
        </div>
        <FilterChips
          options={chipOptions}
          value={statusFilter}
          onChange={onStatusFilterChange}
          ariaLabel="Filter return requests by status"
        />
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-neutral-300 bg-white px-5 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          No return requests match this filter.
        </div>
      ) : (
        <>
          <div className="grid gap-2.5">
            {pageRequests.map((request) => {
              const lostReport = reports.find(
                (report) => report.id === request.itemId,
              );
              const preview = lostReport?.image || request.evidence?.[0] || "";
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelectReturn(request.id)}
                  className="flex w-full items-center gap-3.5 rounded-[14px] border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
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
                      <span className="truncate">{request.claimant}</span>
                      {(requestCounts.get(request.itemId) ?? 1) > 1 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-500/10 dark:text-blue-400">
                          {requestCounts.get(request.itemId)} requests
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={request.status} />
                    <span className="hidden text-right sm:block">
                      <span className="block text-[10px] uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                        Submitted
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {request.submitted}
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
            totalItems={filteredRequests.length}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

/** Detail and review panel for a single return request and its lost item post. */
export function ReturnDetailPanel({
  request: selectedRequest,
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
}: {
  request: ClaimRequest;
  siblingRequests?: ClaimRequest[];
  allRequests: ClaimRequest[];
  reports: AdminReport[];
  physicalItemReceived: (request: ClaimRequest) => boolean;
  onUpdateStatus: (
    id: string,
    status: Exclude<ServerClaimStatus, "claimed">,
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
}) {
  const [confirmAction, setConfirmAction] = useState<{
    requestId: string;
    status: StatusDecision;
  } | null>(null);
  const [confirmPublishRequest, setConfirmPublishRequest] =
    useState<ClaimRequest | null>(null);

  const selectedLostReport = reports.find(
    (report) => report.id === selectedRequest.itemId,
  );

  const activeRequest = selectedRequest;
  const activeReceived = physicalItemReceived(activeRequest);

  const confirmTargetRequest = confirmAction
    ? (allRequests.find((item) => item.id === confirmAction.requestId) ?? null)
    : null;
  const requestsToAutoReject = confirmTargetRequest
    ? allRequests.filter(
        (item) =>
          item.id !== confirmTargetRequest.id &&
          item.itemId === confirmTargetRequest.itemId &&
          item.status === "Pending",
      )
    : [];
  const isAcceptReturn = confirmAction?.status === "Approved";

  const { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen } =
    useSensitiveUnlock();

  const requestStatusChange = (requestId: string, status: StatusDecision) => {
    const target = allRequests.find((item) => item.id === requestId);
    if (!target) return;
    if (status === "Pending" || status === "Returned") {
      if (target.status !== "Approved") return;
    } else if (target.status !== "Pending") return;
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
    try {
      await onUpdateStatus(confirmAction.requestId, serverStatus);
    } catch {
      toast.error("Could not update this return request. Please try again.");
      return;
    }

    if (confirmAction.status === "Approved") {
      toast.success(
        `Approved return of "${confirmTargetRequest.item}" for ${confirmTargetRequest.claimant}.`,
      );
    } else if (confirmAction.status === "Pending") {
      toast.success(
        `Approval cancelled. "${confirmTargetRequest.item}" is pending review again.`,
      );
    } else if (confirmAction.status === "Returned") {
      toast.success(
        `Marked "${confirmTargetRequest.item}" as returned to ${confirmTargetRequest.claimant}.`,
      );
    } else {
      toast.success(
        `Rejected return request for "${confirmTargetRequest.item}".`,
      );
    }
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

  const activeComparison = activeRequest
    ? compareRequestWithPost(activeRequest, selectedLostReport)
    : null;
  const updatingActiveOsa = Boolean(
    activeRequest &&
      isUpdatingOsaReceipt &&
      updatingOsaId === activeRequest.id,
  );
  const publishingActive = Boolean(
    activeRequest && isPublishing && publishingId === activeRequest.id,
  );

  const activeFactRows: ReviewFactRow[] = activeRequest
    ? [
        {
          id: "item-name",
          icon: Tag,
          label: "Item name",
          value: activeRequest.item || "None",
        },
        {
          id: "color",
          icon: Palette,
          label: "Primary color",
          value: activeRequest.color?.trim() || "None",
          note: activeComparison?.color.note,
        },
        {
          id: "physical-item",
          icon: Package,
          label: "Physical item",
          value: (
            <div className="flex flex-wrap items-center gap-3">
              <OsaReceiptStatus received={activeReceived} />
              {activeRequest.status === "Pending" && (
                <button
                  type="button"
                  disabled={updatingActiveOsa}
                  onClick={() =>
                    handleOsaReceiptChange(
                      activeRequest.id,
                      !(activeRequest.receivedByOsa ?? false),
                    )
                  }
                  className={`inline-flex h-8 items-center justify-center rounded-[10px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-50 ${
                    activeRequest.receivedByOsa
                      ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                      : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  }`}
                >
                  {updatingActiveOsa
                    ? "Updating…"
                    : activeRequest.receivedByOsa
                      ? "Mark not yet received"
                      : "Mark received"}
                </button>
              )}
            </div>
          ),
        },
        {
          id: "date-found",
          icon: CalendarDays,
          label: "Date found",
          value: formatDate(activeRequest.dateLost),
          note: activeComparison?.date.note,
        },
        {
          id: "time-found",
          icon: Clock3,
          label: "Time found",
          value: activeRequest.timeLost || "None",
          note: activeComparison?.time.note,
        },
        {
          id: "location-found",
          icon: MapPin,
          label: "Location found",
          value: activeRequest.location || "None",
          note: activeComparison?.location.note,
        },
        {
          id: "building",
          icon: Building2,
          label: "Building",
          value: activeRequest.building?.trim() || "None",
          note: activeComparison?.building.note,
        },
        {
          id: "important-details",
          icon: Lock,
          label: "Important details",
          value: (
            <LockedValue
              value={activeRequest.importantDetails}
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
    <>
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

      <div className="mt-8">
        {activeRequest && (
          <div className="rounded-[20px] border border-neutral-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.10)] sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
            <div className="grid gap-8 md:grid-cols-[280px_minmax(0,1fr)] md:items-start lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="min-w-0">
                {activeRequest.evidence?.length ? (
                  <div
                    className={`grid gap-3 ${
                      activeRequest.evidence.length > 1
                        ? "sm:grid-cols-2 md:grid-cols-1"
                        : ""
                    }`}
                  >
                    {activeRequest.evidence.map((image, index) => (
                      <div
                        key={`${activeRequest.id}-evidence-${index}`}
                        className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                      >
                        <img
                          src={image}
                          alt={`Evidence ${index + 1} from ${activeRequest.claimant}`}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoItemImage
                    title="No photo evidence provided"
                    subtitle="The finder did not attach any photos to this request."
                    className="aspect-[4/3] w-full rounded-3xl"
                  />
                )}
              </div>

              <article className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                      {activeRequest.claimant}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
                      ID{" "}
                      {resolveIdNumber(
                        activeRequest.schoolId,
                        activeRequest.email,
                      ) || "N/A"}{" "}
                      · Submitted {activeRequest.submitted}
                    </p>
                  </div>
                  <StatusBadge status={activeRequest.status} />
                </div>

                {activeRequest.status === "Pending" &&
                  !activeRequest.receivedByOsa && (
                    <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                      Approval is unavailable until the physical item is
                      received by OSA.
                    </div>
                  )}

                {activeRequest.status === "Rejected" &&
                  activeRequest.publishedItemId && (
                    <div className="mt-4 rounded-[12px] border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
                      This found-item post is already available in the public
                      listings.
                    </div>
                  )}

                <p className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  Finder return report
                </p>
                <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Description
                </p>
                <p className="mt-1 break-words text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {activeRequest.details?.trim() ||
                    "No additional details provided."}
                </p>

                <dl className="mt-5 grid grid-cols-1 gap-x-6 border-y border-neutral-200/80 text-xs sm:grid-cols-2 dark:border-neutral-800">
                  {activeFactRows.map((fact) => {
                    const Icon = fact.icon;
                    return (
                      <div
                        key={fact.id}
                        className="flex items-start gap-2.5 py-3"
                      >
                        {Icon && (
                          <Icon
                            className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <dt className="font-bold text-neutral-900 dark:text-neutral-100">
                            {fact.label}
                          </dt>
                          <dd className="mt-1 break-words text-neutral-500 dark:text-neutral-400">
                            {fact.value}
                          </dd>
                          {fact.note && (
                            <span className="mt-0.5 block text-xs font-normal text-neutral-400 dark:text-neutral-500">
                              {fact.note}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </dl>

                {activeRequest.status === "Pending" && (
                  <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        requestStatusChange(activeRequest.id, "Rejected")
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={!activeRequest.receivedByOsa}
                      title={
                        !activeRequest.receivedByOsa
                          ? "Item must be received by OSA before approving"
                          : undefined
                      }
                      onClick={() =>
                        requestStatusChange(activeRequest.id, "Approved")
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Approve
                    </button>
                  </div>
                )}

                {activeRequest.status === "Approved" && (
                  <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        requestStatusChange(activeRequest.id, "Pending")
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-transparent px-4 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestStatusChange(activeRequest.id, "Returned")
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Mark as returned
                    </button>
                  </div>
                )}

                {activeRequest.status === "Rejected" && (
                  <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmPublishRequest(activeRequest)}
                      disabled={
                        Boolean(activeRequest.publishedItemId) ||
                        publishingActive
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      {activeRequest.publishedItemId
                        ? "Posted as found item"
                        : publishingActive
                          ? "Posting item…"
                          : "Post as found item"}
                    </button>
                  </div>
                )}
              </article>
            </div>
          </div>
        )}
      </div>

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
                : confirmAction.status === "Pending"
                  ? "Cancel this approval?"
                  : confirmAction.status === "Returned"
                    ? "Mark item as returned?"
                    : "Reject this return?"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {confirmAction.status === "Approved"
                ? `"${confirmTargetRequest.item}" should only be approved after it has been turned over to the OSA office.`
                : confirmAction.status === "Pending"
                  ? `The approval for "${confirmTargetRequest.item}" will be cancelled and the request will return to Pending for review.`
                  : confirmAction.status === "Returned"
                    ? `"${confirmTargetRequest.item}" will be marked as returned to ${confirmTargetRequest.claimant}. Its item report will show Returned.`
                    : `The return request for "${confirmTargetRequest.item}" by ${confirmTargetRequest.claimant} will be marked as rejected.`}
            </p>
            {isAcceptReturn && requestsToAutoReject.length > 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                {requestsToAutoReject.length === 1
                  ? "1 other pending request for this item will be automatically rejected."
                  : `${requestsToAutoReject.length} other pending requests for this item will be automatically rejected.`}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmAction(null)}
                className="h-10 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className={`h-10 rounded-xl px-5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  confirmAction.status === "Returned"
                    ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700"
                    : "bg-[#E5192D] hover:bg-[#c91424] focus-visible:ring-[#E5192D]"
                }`}
              >
                {confirmAction.status === "Approved"
                  ? "Approve return"
                  : confirmAction.status === "Pending"
                    ? "Cancel approval"
                    : confirmAction.status === "Returned"
                      ? "Mark as returned"
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

      <AdminPasswordModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSubmit={submitPassword}
      />
    </>
  );
}

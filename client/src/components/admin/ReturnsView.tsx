import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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
  Send,
  Tag,
  X,
} from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";
import type { ServerClaimStatus } from "@/services/claimService";
import type { ClaimRequest } from "@/types/claim";
import { resolveIdNumber } from "@/lib/idNumber";
import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { StatusFilter } from "./StatusFilter";
import { AdminPasswordModal, LockedValue } from "./SensitiveDetails";
import { useSensitiveUnlock } from "./useSensitiveUnlock";
import type { AdminReport } from "./types";

const PAGE_SIZE = 10;

const ADMIN_RETURN_STATUS: Partial<
  Record<
    ClaimRequest["status"],
    Exclude<ServerClaimStatus, "claimed">
  >
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

function ReturnRequestSection({
  request,
  physicalItemReceived,
  headingId,
  title,
  onRequestStatus,
  onOsaReceiptChange,
  isUpdatingOsaReceipt,
  onPublish,
  isPublishing,
  unlocked,
  onRequestUnlock,
}: {
  request: ClaimRequest;
  physicalItemReceived: boolean;
  headingId: string;
  title?: string;
  onRequestStatus: (requestId: string, status: StatusDecision) => void;
  onOsaReceiptChange: (requestId: string, receivedByOsa: boolean) => void;
  isUpdatingOsaReceipt: boolean;
  onPublish: (request: ClaimRequest) => void;
  isPublishing: boolean;
  unlocked: boolean;
  onRequestUnlock: () => void;
}) {
  return (
    <section
      {...(title
        ? { "aria-labelledby": headingId }
        : { "aria-label": `${request.claimant}'s request` })}
      className="border-t border-neutral-100 dark:border-neutral-800 pt-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && (
          <h2 id={headingId} className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        )}
        <span className={title ? "" : "ml-auto"}>
          <StatusBadge status={request.status} />
        </span>
      </div>
      <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          {request.evidence?.length ? (
            <div
              className={`grid gap-2 ${
                request.evidence.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {request.evidence.map((image, index) => (
                <div
                  key={`${request.id}-evidence-${index}`}
                  className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800"
                >
                  <img
                    src={image}
                    alt={`Evidence ${index + 1} from ${request.claimant}`}
                    className="h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            <NoItemImage
              title="No photo evidence provided"
              className="h-72 w-full"
            />
          )}
          {request.status === "Pending" && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <button
                type="button"
                disabled={!request.receivedByOsa}
                onClick={() => onRequestStatus(request.id, "Approved")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => onRequestStatus(request.id, "Rejected")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Reject
              </button>
            </div>
          )}
          {request.status === "Pending" && !request.receivedByOsa && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Approval is unavailable until the physical item is received by OSA.
            </p>
          )}
          {request.status === "Rejected" && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => onPublish(request)}
                disabled={Boolean(request.publishedItemId) || isPublishing}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {request.publishedItemId
                  ? "Posted as found item"
                  : isPublishing
                    ? "Posting item…"
                    : "Post as found item"}
              </button>
              {request.publishedItemId && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  This found-item post is already available in the public listings.
                </p>
              )}
            </div>
          )}
          {request.status === "Approved" && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => onRequestStatus(request.id, "Returned")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Mark as returned
              </button>
              <button
                type="button"
                onClick={() => onRequestStatus(request.id, "Pending")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {request.claimant}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            Id number: {resolveIdNumber(request.schoolId, request.email) || "N/A"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {request.details || "None"}
          </p>
          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Tag className="h-3 w-3" aria-hidden="true" />
                Item name
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.item || "None"}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Submitted
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.submitted || "None"}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Palette className="h-3 w-3" aria-hidden="true" />
                Primary color
              </dt>
              <dd className="mt-1 font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                {request.color?.trim() || "None"}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Package className="h-3 w-3" aria-hidden="true" />
                Physical Item
              </dt>
              <dd className="mt-1 space-y-2">
                <OsaReceiptStatus received={physicalItemReceived} />
                {request.status === "Pending" && (
                  <button
                    type="button"
                    disabled={isUpdatingOsaReceipt}
                    onClick={() =>
                      onOsaReceiptChange(
                        request.id,
                        !(request.receivedByOsa ?? false),
                      )
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 px-2.5 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {isUpdatingOsaReceipt
                      ? "Updating…"
                      : request.receivedByOsa
                        ? "Mark not yet received"
                        : "Mark received"}
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Date found
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {formatDate(request.dateLost)}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                Time found
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.timeLost || "None"}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                Location found
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.location || "None"}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                Building
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.building?.trim() || "None"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Important details
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                <LockedValue
                  value={request.importantDetails}
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

/** Full-page list of lost-item return requests. */
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

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleRequests.filter(
      (request) =>
        (statusFilter === "All" || request.status === statusFilter) &&
        [
          request.item,
          request.claimant,
          request.location,
          request.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
    );
  }, [query, visibleRequests, statusFilter]);

  const requestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of visibleRequests) {
      counts.set(request.itemId, (counts.get(request.itemId) ?? 0) + 1);
    }
    return counts;
  }, [visibleRequests]);

  // Reset to page 1 when filters/list size change.
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

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const rangeStart =
    filteredRequests.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredRequests.length);

  return (
    <Panel
      title="Return Item"
      titleAdornment={
        <span className="shrink-0 text-xs font-normal text-neutral-500 dark:text-neutral-400">
          {filteredRequests.length}
        </span>
      }
      action={
        <div className="flex">
          <StatusFilter
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={[
              "All",
              "Pending",
              "Approved",
              "Returned",
              "Rejected",
            ]}
          />
        </div>
      }
    >
      {filteredRequests.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No return requests match this search.
        </p>
      ) : (
        <>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
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
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] sm:px-5"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt={`${request.item} evidence`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <NoItemImage compact className="h-12 w-12" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block break-normal text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                      {request.item}
                    </span>
                    <span className="mt-1 block max-h-8 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                      {request.claimant}
                      {(requestCounts.get(request.itemId) ?? 1) > 1 && (
                        <span className="ml-1.5 rounded-md bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-400">
                          {requestCounts.get(request.itemId)} requests
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={request.status} />
                    <span className="hidden text-right sm:block">
                      <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">
                        Submitted
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
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
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sm:px-5">
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Showing {rangeStart}–{rangeEnd} of {filteredRequests.length}
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
  );
}

/** Detail and review panel for a single return request and its lost item post. */
export function ReturnDetailPanel({
  request: selectedRequest,
  siblingRequests,
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
  siblingRequests: ClaimRequest[];
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
          responseMessage || "Could not post this found item. Please try again.",
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

  return (
    <>
      <Panel title={selectedRequest.item} plain>
        <div className="space-y-4">
          <section aria-labelledby="return-item-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="return-item-heading"
                className="text-sm font-bold text-neutral-900 dark:text-neutral-100"
              >
                Lost item
              </h2>
              <StatusBadge status="Lost" />
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {selectedLostReport?.image ? (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800">
                    <img
                      src={selectedLostReport.image}
                      alt={`${selectedRequest.item} item`}
                      loading="lazy"
                      className="h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <NoItemImage
                  title="No item photo provided"
                  subtitle="This report did not include any photos of the item."
                  className="mt-2 h-72 w-full"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedLostReport?.reportedBy || "None"}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  Id number: {resolveIdNumber(selectedLostReport?.reporterSchoolId, selectedLostReport?.reporterEmail) || "N/A"}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {selectedLostReport?.description || "None"}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 dark:border-neutral-800 py-3 text-xs">
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      Category
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.category || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      Post date
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.date || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" />
                      Date lost
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatDate(selectedLostReport?.eventDateTime || "")}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      Time lost
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.eventDateTime
                        ? new Intl.DateTimeFormat("en-PH", {
                            timeStyle: "short",
                          }).format(new Date(selectedLostReport.eventDateTime))
                        : "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Location lost
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.specificLocation || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <Building2 className="h-3 w-3" aria-hidden="true" />
                      Building
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.buildingName?.trim() || "None"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <Palette className="h-3 w-3" aria-hidden="true" />
                      Color
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedLostReport?.color?.trim() || "None"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Important details
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                      <LockedValue
                        value={selectedLostReport?.confidentialInfo}
                        unlocked={unlocked}
                        onUnlock={requestUnlock}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
          <ReturnRequestSection
            request={selectedRequest}
            physicalItemReceived={physicalItemReceived(selectedRequest)}
            headingId="return-evidence-heading"
            title={
              siblingRequests.length > 0
                ? `Return request (${siblingRequests.length + 1})`
                : "Return evidence"
            }
            onRequestStatus={requestStatusChange}
            onOsaReceiptChange={handleOsaReceiptChange}
            isUpdatingOsaReceipt={
              isUpdatingOsaReceipt && updatingOsaId === selectedRequest.id
            }
            onPublish={setConfirmPublishRequest}
            isPublishing={isPublishing && publishingId === selectedRequest.id}
            unlocked={unlocked}
            onRequestUnlock={requestUnlock}
          />
          {siblingRequests.length > 0 && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <div className="space-y-2">
                {siblingRequests.map((sibling) => (
                  <ReturnRequestSection
                    key={sibling.id}
                    request={sibling}
                    physicalItemReceived={physicalItemReceived(sibling)}
                    headingId={`return-request-${sibling.id}`}
                    onRequestStatus={requestStatusChange}
                    onOsaReceiptChange={handleOsaReceiptChange}
                    isUpdatingOsaReceipt={
                      isUpdatingOsaReceipt && updatingOsaId === sibling.id
                    }
                    onPublish={setConfirmPublishRequest}
                    isPublishing={isPublishing && publishingId === sibling.id}
                    unlocked={unlocked}
                    onRequestUnlock={requestUnlock}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

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
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              aria-label="Close confirmation"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
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
              <p className="mt-3 rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
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
                className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-800 px-5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
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
              “{confirmPublishRequest.claimantTitle || confirmPublishRequest.item}”
              will be added to the public found-items list with its report details
              and photos.
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

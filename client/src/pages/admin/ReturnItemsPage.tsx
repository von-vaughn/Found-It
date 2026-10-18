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
  Tag,
  X,
} from "lucide-react";
import { itemToAdminReport } from "@/components/admin/adminData";
import { NoItemImage } from "@/components/NoItemImage";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusFilter } from "@/components/admin/StatusFilter";
import {
  AdminPasswordModal,
  LockedValue,
} from "@/components/admin/SensitiveDetails";
import { useSensitiveUnlock } from "@/components/admin/useSensitiveUnlock";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";
import { AdminLayout } from "./AdminLayout";

const PAGE_SIZE = 10;
type ReturnStatus = ReturnItemRequest["status"];

const RESOLVED_RETURN_STATUSES: ReturnStatus[] = [
  "Approved",
  "Claimed",
  "Returned",
];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "None"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

type StatusDecision = "Approved" | "Rejected" | "Claimed";

function ReturnRequestSection({
  request,
  headingId,
  title,
  onRequestStatus,
  unlocked,
  onRequestUnlock,
}: {
  request: ReturnItemRequest;
  headingId: string;
  title?: string;
  onRequestStatus: (requestId: string, status: StatusDecision) => void;
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
                onClick={() => onRequestStatus(request.id, "Approved")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Approve return
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
          {request.status === "Approved" && (
            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => onRequestStatus(request.id, "Claimed")}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Mark as claimed
              </button>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {request.claimant}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {request.email || "None"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {request.details || "None"}
          </p>
          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
            <div>
              <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <Package className="h-3 w-3" aria-hidden="true" />
                Item name
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.lostItemTitle}
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
                <Tag className="h-3 w-3" aria-hidden="true" />
                What is it?
              </dt>
              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                {request.claimantTitle?.trim() || request.item}
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
            <div className="col-span-2">
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

export function ReturnItemsPage({
  items,
  requests,
  onStatusChange,
}: {
  items: Item[];
  requests: ReturnItemRequest[];
  onStatusChange: (requestId: string, status: ReturnStatus) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    requestId: string;
    status: StatusDecision;
  } | null>(null);

  const visibleRequests = useMemo(() => {
    const resolvedItemIds = new Set(
      requests
        .filter((request) => RESOLVED_RETURN_STATUSES.includes(request.status))
        .map((request) => request.itemId),
    );
    // Once one request is approved for an item, the other requests for
    // that item are resolved away — only show the approved one.
    return requests.filter(
      (request) =>
        !resolvedItemIds.has(request.itemId) ||
        RESOLVED_RETURN_STATUSES.includes(request.status),
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleRequests.filter(
      (request) =>
        request.status === statusFilter &&
        [
          request.lostItemTitle,
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

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedId) ??
    filteredRequests[0] ??
    null;
  const selectedLostItem = selectedRequest
    ? items.find((item) => item.id === selectedRequest.itemId)
    : undefined;
  const selectedLostReport = selectedLostItem
    ? itemToAdminReport(selectedLostItem)
    : undefined;
  const rangeStart =
    filteredRequests.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredRequests.length);
  // Other requests filed for the same lost item, so competing return
  // requests can be compared side by side before approving one.
  const siblingRequests = selectedRequest
    ? visibleRequests.filter(
        (request) =>
          request.itemId === selectedRequest.itemId &&
          request.id !== selectedRequest.id,
      )
    : [];
  const confirmTargetRequest = confirmAction
    ? (requests.find((request) => request.id === confirmAction.requestId) ??
      null)
    : null;
  // Other pending requests for the same item: approving/claiming one
  // resolves the item, so the rest are rejected automatically on confirm.
  const requestsToAutoReject = confirmTargetRequest
    ? requests.filter(
        (request) =>
          request.id !== confirmTargetRequest.id &&
          request.itemId === confirmTargetRequest.itemId &&
          request.status === "Pending",
      )
    : [];
  const isAcceptReturn =
    confirmAction?.status === "Approved" ||
    confirmAction?.status === "Claimed";

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen } =
    useSensitiveUnlock();

  const requestStatusChange = (requestId: string, status: StatusDecision) => {
    const target = requests.find((request) => request.id === requestId);
    if (!target) return;
    if (status === "Claimed") {
      if (target.status !== "Approved") return;
    } else if (target.status !== "Pending") return;
    setConfirmAction({ requestId, status });
  };

  const confirmStatusChange = () => {
    if (!confirmAction || !confirmTargetRequest) return;
    onStatusChange(confirmAction.requestId, confirmAction.status);
    if (confirmAction.status === "Approved") {
      toast.success(
        `Approved return of "${confirmTargetRequest.lostItemTitle}" for ${confirmTargetRequest.claimant}.`,
      );
    } else if (confirmAction.status === "Claimed") {
      toast.success(
        `Marked "${confirmTargetRequest.lostItemTitle}" as claimed for ${confirmTargetRequest.claimant}.`,
      );
    } else {
      toast.success(
        `Rejected return request for "${confirmTargetRequest.lostItemTitle}".`,
      );
    }
    if (
      confirmAction.status === "Approved" ||
      confirmAction.status === "Claimed"
    ) {
      for (const sibling of requestsToAutoReject) {
        onStatusChange(sibling.id, "Rejected");
      }
    }
    setConfirmAction(null);
  };

  const requestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of visibleRequests) {
      counts.set(request.itemId, (counts.get(request.itemId) ?? 0) + 1);
    }
    return counts;
  }, [visibleRequests]);

  useEffect(() => {
    if (!confirmAction) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmAction(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmAction]);

  return (
    <AdminLayout
      activeSection="returns"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search return requests…"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {filteredRequests.length} return requests
        </p>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(360px,1.3fr)]">
        <Panel
          title="Return requests"
          stickyHeader
          className="overflow-x-clip no-scrollbar xl:sticky xl:top-20 xl:flex xl:h-[min(53.5rem,calc(100dvh-6rem))] xl:flex-col xl:self-start xl:overflow-y-auto"
          action={
            <div className="flex">
              <StatusFilter
                value={statusFilter}
                onChange={updateStatusFilter}
                options={["Pending", "Approved", "Claimed", "Returned", "Rejected"]}
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
                  const lostItem = items.find(
                    (item) => item.id === request.itemId,
                  );
                  const preview = lostItem?.image || request.evidence?.[0] || "";
                  return (
                    <button
                      key={request.id}
                      type="button"
                      aria-pressed={selectedRequest?.id === request.id}
                      onClick={() => setSelectedId(request.id)}
                      className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] sm:px-5 ${
                        selectedRequest?.id === request.id
                          ? "bg-neutral-50 dark:bg-neutral-800"
                          : "hover:bg-neutral-50 dark:bg-neutral-800/70 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt={`${request.lostItemTitle} evidence`}
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <NoItemImage compact className="h-12 w-12" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block break-normal text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                          {request.lostItemTitle}
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
                      <span className="hidden text-right sm:block">
                        <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">
                          Submitted
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                          {request.submitted}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sm:px-5">
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

        <Panel
          title={selectedRequest?.lostItemTitle ?? "Return request details"}
          plain
        >
          {selectedRequest ? (
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
                  <div className="flex min-h-48 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
                    {selectedLostItem?.image ? (
                      <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-800">
                        <img
                          src={selectedLostItem.image}
                          alt={`${selectedRequest.lostItemTitle} item`}
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
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {selectedLostItem?.contactName || "None"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedLostReport?.reporterEmail || "None"}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {selectedLostItem?.description || "None"}
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
                            value={selectedLostItem?.confidentialInfo}
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
                headingId="return-evidence-heading"
                title={
                  siblingRequests.length > 0
                    ? `Return request (${siblingRequests.length + 1})`
                    : "Return evidence"
                }
                onRequestStatus={requestStatusChange}
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
                        headingId={`return-request-${sibling.id}`}
                        onRequestStatus={requestStatusChange}
                        unlocked={unlocked}
                        onRequestUnlock={requestUnlock}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No selected return request matches this search.
            </p>
          )}
        </Panel>
      </div>

      {confirmAction && confirmTargetRequest && (        <div
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
                : confirmAction.status === "Claimed"
                  ? "Mark as claimed?"
                  : "Reject this return?"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {confirmAction.status === "Approved"
                ? `"${confirmTargetRequest.lostItemTitle}" will be marked as approved for ${confirmTargetRequest.claimant}, and they will be notified to proceed with the return.`
                : confirmAction.status === "Claimed"
                  ? `"${confirmTargetRequest.lostItemTitle}" will be marked as claimed for ${confirmTargetRequest.claimant}, confirming they have received the item.`
                  : `The return request for "${confirmTargetRequest.lostItemTitle}" by ${confirmTargetRequest.claimant} will be marked as rejected.`}
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
                  confirmAction.status === "Approved"
                    ? "bg-[#E5192D] hover:bg-[#c91424] focus-visible:ring-[#E5192D]"
                    : confirmAction.status === "Claimed"
                      ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700"
                      : "bg-neutral-900 hover:bg-neutral-700 focus-visible:ring-neutral-900"
                }`}
              >
                {confirmAction.status === "Approved"
                  ? "Approve return"
                  : confirmAction.status === "Claimed"
                    ? "Confirm claimed"
                    : "Reject request"}
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
    </AdminLayout>
  );
}

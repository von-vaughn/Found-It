import { useMemo, useState } from "react";
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
import { itemToAdminReport } from "@/components/admin/adminData";
import { NoItemImage } from "@/components/admin/NoItemImage";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusFilter } from "@/components/admin/StatusFilter";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";
import { AdminLayout } from "./AdminLayout";

const PAGE_SIZE = 10;
type ReturnStatus = ReturnItemRequest["status"];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "None"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
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
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return requests.filter(
      (request) =>
        (statusFilter === "All statuses" || request.status === statusFilter) &&
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
  }, [query, requests, statusFilter]);

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

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const changeStatus = (status: "Approved" | "Rejected") => {
    if (!selectedRequest || selectedRequest.status !== "Pending") return;
    const action = status === "Approved" ? "approve" : "reject";
    if (
      !window.confirm(
        `Are you sure you want to ${action} the return request for "${selectedRequest.lostItemTitle}"?`,
      )
    ) {
      return;
    }
    onStatusChange(selectedRequest.id, status);
  };

  return (
    <AdminLayout
      activeSection="returns"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search return requests…"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
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
              />
            </div>
          }
        >
          {filteredRequests.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No return requests match this search.
            </p>
          ) : (
            <>
              <div className="divide-y divide-neutral-100">
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
                          ? "bg-neutral-50"
                          : "hover:bg-neutral-50/70"
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
                        <span className="block break-normal text-sm font-bold leading-snug text-neutral-900">
                          {request.lostItemTitle}
                        </span>
                        <span className="mt-1 block max-h-8 truncate text-[11px] text-neutral-500">
                          {request.claimant} · {request.id}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <span className="block text-[10px] text-neutral-500">
                          Submitted
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-neutral-700">
                          {request.submitted}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 bg-white px-4 py-3 sm:px-5">
                <p className="text-[11px] text-neutral-500">
                  Showing {rangeStart}–{rangeEnd} of {filteredRequests.length}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(safePage - 1)}
                      disabled={safePage <= 1}
                      aria-label="Previous page"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
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
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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
                      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
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
          titleSize="large"
          borderless
        >
          {selectedRequest ? (
            <div className="space-y-4 p-4 sm:p-5">
              <section aria-labelledby="return-item-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="return-item-heading"
                    className="text-sm font-bold text-neutral-900"
                  >
                    Lost item
                  </h2>
                  {selectedLostReport && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      {selectedLostReport.type}
                    </span>
                  )}
                </div>
                <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="flex min-h-48 items-center justify-center rounded-lg bg-neutral-50 p-3 text-center">
                    {selectedLostItem?.image ? (
                      <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
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
                    <p className="truncate text-sm font-bold text-neutral-900">
                      {selectedLostItem?.contactName || "None"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {selectedLostReport?.reporterEmail || "None"}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-700">
                      {selectedLostItem?.description || "None"}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 py-3 text-xs">
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Tag className="h-3 w-3" aria-hidden="true" />
                          Category
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.category || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Post date
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.date || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarClock className="h-3 w-3" aria-hidden="true" />
                          Date lost
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {formatDate(selectedLostReport?.eventDateTime || "")}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          Time lost
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.eventDateTime
                            ? new Intl.DateTimeFormat("en-PH", {
                                timeStyle: "short",
                              }).format(new Date(selectedLostReport.eventDateTime))
                            : "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Specific location
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.specificLocation || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          Building
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.buildingName?.trim() || "None"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Palette className="h-3 w-3" aria-hidden="true" />
                          Color
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedLostReport?.color?.trim() || "None"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>
              <section
                aria-labelledby="return-evidence-heading"
                className="border-t border-neutral-100 pt-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="return-evidence-heading"
                    className="text-sm font-bold text-neutral-900"
                  >
                    Return evidence
                  </h2>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0">
                    {selectedRequest.evidence?.length ? (
                      <div
                        className={`grid gap-2 ${
                          selectedRequest.evidence.length > 1
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {selectedRequest.evidence.map((image, index) => (
                          <div
                            key={`${selectedRequest.id}-evidence-${index}`}
                            className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50"
                          >
                            <img
                              src={image}
                              alt={`Evidence ${index + 1} from ${selectedRequest.claimant}`}
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
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">
                      {selectedRequest.claimant}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {selectedRequest.email || "None"}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-700">
                      {selectedRequest.details || "None"}
                    </p>
                    <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-3 text-xs">
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Submitted
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedRequest.submitted || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Date found
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {formatDate(selectedRequest.dateLost)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          Time found
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedRequest.timeLost || "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Location found
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedRequest.location || "None"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                {selectedRequest.status === "Pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4">
                    <button
                      type="button"
                      onClick={() => changeStatus("Approved")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Approve return
                    </button>
                    <button
                      type="button"
                      onClick={() => changeStatus("Rejected")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No selected return request matches this search.
            </p>
          )}
        </Panel>
      </div>
    </AdminLayout>
  );
}

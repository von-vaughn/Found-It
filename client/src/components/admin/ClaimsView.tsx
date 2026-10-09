import { useState } from "react";

const PAGE_SIZE = 10;
import {
  BadgeCheck,
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
import { formatItemDateTime } from "@/lib/dateTime";
import { Panel } from "./Panel";
import { NoItemImage } from "./NoItemImage";
import { StatusBadge } from "./StatusBadge";
import { StatusFilter } from "./StatusFilter";
import { adminReports } from "./adminData";
import type { ClaimRequest } from "@/types/claim";

export function ClaimsView({
  claims: claimRequests,
  query,
  selectedClaim,
  selectedClaimId,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
}: {
  claims: ClaimRequest[];
  query: string;
  selectedClaim: ClaimRequest;
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const [submittedClaimsActive, setSubmittedClaimsActive] = useState(false);
  const [page, setPage] = useState(1);
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
  const selectedItemPost = visibleSelectedClaim
    ? adminReports.find((report) => report.id === visibleSelectedClaim.itemId)
    : undefined;
  const selectedItemImage = selectedItemPost?.image ?? "";

  return (
    <div className="overflow-x-clip">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {filteredClaims.length} claims
        </p>
      </div>
      <div
        className={`grid min-w-0 gap-5 transition-[grid-template-columns] duration-300 ease-in-out ${
          submittedClaimsActive
            ? "xl:grid-cols-[minmax(0,0.7fr)_minmax(360px,1.3fr)]"
            : "xl:grid-cols-[minmax(240px,0.35fr)_minmax(360px,1.65fr)]"
        }`}
      >
        <Panel
          title="Submitted claims"
          stickyHeader
          className={`group overflow-x-clip no-scrollbar xl:sticky xl:top-20 xl:flex xl:h-[min(53.5rem,calc(100dvh-6rem))] xl:flex-col xl:self-start ${
            submittedClaimsActive ? "xl:overflow-y-auto" : "xl:overflow-hidden"
          }`}
          onMouseEnter={() => setSubmittedClaimsActive(true)}
          onMouseLeave={(event) =>
            setSubmittedClaimsActive(
              event.currentTarget.contains(document.activeElement),
            )
          }
          onFocusCapture={() => setSubmittedClaimsActive(true)}
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (
              (!(nextTarget instanceof Node) ||
                !event.currentTarget.contains(nextTarget)) &&
              !event.currentTarget.matches(":hover")
            ) {
              setSubmittedClaimsActive(false);
            }
          }}
          action={
            <div className="flex xl:hidden xl:group-hover:flex xl:group-focus-within:flex">
              <StatusFilter
                value={statusFilter}
                onChange={onStatusFilterChange}
              />
            </div>
          }
        >
          {filteredClaims.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No claims match this search.
            </p>
          ) : (
            <>
            <div className="divide-y divide-neutral-100">
              {pagedClaims.map((claim) => {
                const itemImage =
                  adminReports.find((report) => report.id === claim.itemId)
                    ?.image ?? "";

                return (
                  <button
                    key={claim.id}
                    type="button"
                    aria-pressed={selectedClaimId === claim.id}
                    onClick={() => onSelectClaim(claim.id)}
                    className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] sm:px-5 ${
                      selectedClaimId === claim.id
                        ? "bg-neutral-50"
                        : "hover:bg-neutral-50/70"
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
                      <span className="block break-normal text-sm font-bold leading-snug text-neutral-900">
                        {claim.item}
                      </span>
                      <span className="mt-1 block max-h-8 truncate text-[11px] text-neutral-500 transition-[max-height,opacity] duration-200 xl:max-h-0 xl:overflow-hidden xl:opacity-0 xl:group-hover:max-h-8 xl:group-hover:opacity-100 xl:group-focus-within:max-h-8 xl:group-focus-within:opacity-100">
                        {claim.claimant} · {claim.id}
                      </span>
                    </span>
                    <span className="hidden text-right transition-[max-height,opacity] duration-200 sm:block xl:max-h-0 xl:overflow-hidden xl:opacity-0 xl:group-hover:max-h-10 xl:group-hover:opacity-100 xl:group-focus-within:max-h-10 xl:group-focus-within:opacity-100">
                      <span className="block text-[10px] text-neutral-500">
                        Submitted
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-neutral-700">
                        {claim.submitted}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {submittedClaimsActive && (
            <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 bg-white px-4 py-3 sm:px-5">
              <p className="text-[11px] text-neutral-500">
                Showing {rangeStart}–{rangeEnd} of {filteredClaims.length}
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
            )}
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
                    className="text-sm font-bold text-neutral-900"
                  >
                    {selectedItemPost?.type === "Found"
                      ? "Found item"
                      : "Lost item"}
                  </h2>
                  {selectedItemPost && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      {selectedItemPost.type}
                    </span>
                  )}
                </div>
                <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0">
                    {selectedItemImage ? (
                      <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
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
                        <p className="truncate text-sm font-bold text-neutral-900">
                          {selectedItemPost.reportedBy}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {selectedItemPost.reporterEmail}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-neutral-700">
                          {selectedItemPost.description}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 py-3 text-xs">
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Tag className="h-3 w-3" aria-hidden="true" />
                          Category
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.category}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          Post status
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Post date
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.date}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <CalendarClock
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          {selectedItemPost.type === "Found"
                            ? "Date found"
                            : "Date lost"}
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.eventDateTime
                            ? (formatItemDateTime(
                                selectedItemPost.eventDateTime,
                              ) ?? "Not provided")
                            : "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Specific location
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.specificLocation}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          Building
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.buildingName?.trim() ||
                            "Not provided"}
                        </dd>
                      </div>
                      {selectedItemPost.color && (
                        <div className="col-span-2">
                          <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                            <Palette className="h-3 w-3" aria-hidden="true" />
                            Color
                          </dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.color}
                          </dd>
                        </div>
                      )}
                    </dl>
                      </>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        The original item post could not be found.
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <section
                aria-labelledby="claim-request-heading"
                className="border-t border-neutral-100 pt-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="claim-request-heading"
                    className="text-sm font-bold text-neutral-900"
                  >
                    Claim request
                  </h2>
                  <StatusBadge status={visibleSelectedClaim.status} />
                </div>
                <div className="mt-3 grid items-stretch gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0">
                    {visibleSelectedClaim.evidence &&
                    visibleSelectedClaim.evidence.length > 0 ? (
                      <div
                        className={`mt-2 grid gap-2 ${
                          visibleSelectedClaim.evidence.length > 1
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {visibleSelectedClaim.evidence.map((image, index) => (
                          <div
                            key={`${visibleSelectedClaim.id}-evidence-${index}`}
                            className="flex h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50"
                          >
                            <img
                              src={image}
                              alt={`Photo evidence ${index + 1} submitted by ${visibleSelectedClaim.claimant}`}
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
                        disabled
                        title="Approval is a visual preview only"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Approve claim
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Rejection is a visual preview only"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-400"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">
                      {visibleSelectedClaim.claimant}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {visibleSelectedClaim.email ??
                        `${visibleSelectedClaim.claimant
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "_")
                          .replace(/^_|_$/g, "")}@wmsu.edu.ph`}
                    </p>
                    <div className="mt-3 border-b border-neutral-100 pb-3">
                      <p className="text-xs leading-relaxed text-neutral-700">
                        {visibleSelectedClaim.details}
                      </p>
                    </div>
                    <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        Submitted
                      </dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.submitted}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {selectedItemPost?.type === "Lost"
                          ? "Date found"
                          : "Date lost"}
                      </dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.dateLost}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        {selectedItemPost?.type === "Lost"
                          ? "Time found"
                          : "Time lost"}
                      </dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.timeLost}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        Location lost
                      </dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.location}
                      </dd>
                    </div>
                  </dl>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No selected claim matches this search.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

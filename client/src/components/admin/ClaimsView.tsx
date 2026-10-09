import { useState } from "react";
import { Check, MapPin, Package, X } from "lucide-react";
import { Panel } from "./Panel";
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
  const filteredClaims = claimRequests.filter(
    (claim) =>
      (statusFilter === "All statuses" || claim.status === statusFilter) &&
      [claim.id, claim.item, claim.claimant, claim.location]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
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
          className="group xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto"
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
            <div className="divide-y divide-neutral-100">
              {filteredClaims.map((claim) => {
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
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                      >
                        <Package className="h-5 w-5" />
                      </span>
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
          )}
        </Panel>

        <Panel title="Claim details" borderless>
          {visibleSelectedClaim ? (
            <div className="space-y-4 p-4 sm:p-5">
              <section aria-labelledby="claim-item-post-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="claim-item-post-heading"
                    className="text-sm font-bold text-neutral-900"
                  >
                    {selectedItemPost?.type === "Found"
                      ? "Found item post"
                      : "Original item post"}
                  </h2>
                  {selectedItemPost && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      {selectedItemPost.type}
                    </span>
                  )}
                </div>
                {selectedItemImage ? (
                  <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 sm:h-56">
                    <img
                      src={selectedItemImage}
                      alt={`${visibleSelectedClaim.item} item`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-40 w-full items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                  >
                    <Package className="h-8 w-8" />
                  </div>
                )}
                {selectedItemPost ? (
                  <>
                    <h3 className="mt-3 text-base font-bold text-neutral-900">
                      {selectedItemPost.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-700">
                      {selectedItemPost.description}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 py-3 text-xs">
                      <div>
                        <dt className="text-[10px] text-neutral-500">
                          Category
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.category}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-neutral-500">
                          Post status
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-neutral-500">
                          Posted by
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.reportedBy}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-neutral-500">
                          Post date
                        </dt>
                        <dd className="mt-1 font-semibold text-neutral-800">
                          {selectedItemPost.date}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[10px] text-neutral-500">
                          Post location
                        </dt>
                        <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                          <MapPin
                            className="h-3.5 w-3.5 text-neutral-400"
                            aria-hidden="true"
                          />
                          {selectedItemPost.building}
                        </dd>
                      </div>
                      {selectedItemPost.color && (
                        <div className="col-span-2">
                          <dt className="text-[10px] text-neutral-500">Color</dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.color}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-neutral-500">
                    The original item post could not be found.
                  </p>
                )}
              </section>
              <section
                aria-labelledby="claim-request-heading"
                className="border-t border-neutral-100 pt-4"
              >
                <h2
                  id="claim-request-heading"
                  className="text-sm font-bold text-neutral-900"
                >
                  Claim request
                </h2>
                <p className="mt-2 text-sm font-semibold text-neutral-800">
                  {visibleSelectedClaim.claimant}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <dt className="text-[10px] text-neutral-500">Request ID</dt>
                    <dd className="mt-1 font-semibold text-neutral-800">
                      {visibleSelectedClaim.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-neutral-500">
                      Claim status
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800">
                      {visibleSelectedClaim.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-neutral-500">Submitted</dt>
                    <dd className="mt-1 font-semibold text-neutral-800">
                      {visibleSelectedClaim.submitted}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-neutral-500">Date lost</dt>
                    <dd className="mt-1 font-semibold text-neutral-800">
                      {visibleSelectedClaim.dateLost}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-neutral-500">
                      Approx. time lost
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-800">
                      {visibleSelectedClaim.timeLost}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-neutral-500">
                      Location lost
                    </dt>
                    <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                      <MapPin
                        className="h-3.5 w-3.5 text-neutral-400"
                        aria-hidden="true"
                      />
                      {visibleSelectedClaim.location}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-neutral-500">
                      Identifying details provided
                    </dt>
                    <dd className="mt-1.5 leading-relaxed text-neutral-700">
                      {visibleSelectedClaim.details}
                    </dd>
                  </div>
                  {visibleSelectedClaim.evidence &&
                    visibleSelectedClaim.evidence.length > 0 && (
                      <div className="col-span-2">
                        <dt className="text-[10px] font-semibold text-neutral-500">
                          Claimant photo evidence
                        </dt>
                        <dd className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {visibleSelectedClaim.evidence.map((image, index) => (
                            <img
                              key={`${visibleSelectedClaim.id}-evidence-${index}`}
                              src={image}
                              alt={`Photo evidence ${index + 1} submitted by ${visibleSelectedClaim.claimant}`}
                              loading="lazy"
                              className="aspect-square w-full rounded-lg bg-neutral-50 object-contain"
                            />
                          ))}
                        </dd>
                      </div>
                    )}
                </dl>
              </section>
              <label className="block text-[10px] font-semibold text-neutral-500">
                Update item status
                <select
                  disabled
                  name="item-status"
                  defaultValue="Open"
                  aria-label="Update item status, preview only"
                  className="mt-1.5 h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-500"
                >
                  <option>Open</option>
                  <option>Claimed</option>
                  <option>Returned</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
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

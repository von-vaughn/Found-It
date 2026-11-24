import { type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";
import { PhotoCarousel, type CarouselPhoto } from "@/components/PhotoCarousel";
import {
  simplifiedClaimStatusStyles,
  simplifyClaimStatus,
} from "@/components/school_user/claimStatus";
import type { ClaimRequest } from "@/types/claim";
import { StatusBadge } from "./StatusBadge";
import type { MatchTone } from "./requestComparison";

export interface ReviewFactRow {
  id: string;
  label: string;
  value: ReactNode;
  note?: string;
}

export interface FilterChipOption<T extends string = string> {
  key: T;
  label: string;
  count: number;
}

function OriginalPostFacts({
  image,
  imageAlt,
  emptyImageTitle = "No item photo provided",
  emptyImageSubtitle = "This report did not include any photos of the item.",
  reporterName,
  reporterMeta,
  facts,
  notes,
}: {
  image?: string;
  imageAlt: string;
  emptyImageTitle?: string;
  emptyImageSubtitle?: string;
  reporterName: string;
  reporterMeta: string;
  facts: ReviewFactRow[];
  notes?: string;
}) {
  return (
    <div>
      {image ? (
        <div className="aspect-[4/3] w-full overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <NoItemImage
          title={emptyImageTitle}
          subtitle={emptyImageSubtitle}
          className="aspect-[4/3] w-full rounded-[14px]"
        />
      )}

      <div>
        <div className="mt-4">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {reporterName}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {reporterMeta}
          </p>
        </div>

        <dl className="mt-4 border-t border-neutral-200 dark:border-neutral-800">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-neutral-200 py-2.5 text-sm dark:border-neutral-800"
            >
              <dt className="pt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{fact.label}</span>
              </dt>
              <dd className="min-w-0 font-medium text-neutral-900 dark:text-neutral-100">
                <div className="break-words">{fact.value}</div>
                {fact.note && (
                  <span className="mt-0.5 block text-xs font-normal text-amber-700 dark:text-amber-300">
                    {fact.note}
                  </span>
                )}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-neutral-200 py-2.5 text-sm dark:border-neutral-800">
            <dt className="pt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Description
            </dt>
            <dd className="min-w-0 text-xs leading-relaxed font-normal text-neutral-600 dark:text-neutral-400">
              {notes?.trim() || "No additional description provided."}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function OriginalPostCard({
  postedDateLabel,
  itemTitle,
  reportTypeLabel = "Original post",
  image,
  imageAlt,
  reporterName,
  reporterMeta,
  facts,
  notes,
  footer,
  layout = "stacked",
}: {
  postedDateLabel: string;
  itemTitle?: string;
  reportTypeLabel?: string;
  image?: string;
  imageAlt: string;
  reporterName: string;
  reporterMeta: string;
  facts: ReviewFactRow[];
  notes?: string;
  footer?: ReactNode;
  layout?: "stacked" | "horizontal";
}) {
  if (layout === "horizontal") {
    const heroFacts = facts.filter((fact) => fact.id !== "item-name");
    const normalizedType = reportTypeLabel.toLowerCase();
    const typeBadge = normalizedType.includes("lost")
      ? {
          label: "Lost",
          style:
            "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
        }
      : normalizedType.includes("found")
        ? {
            label: "Found",
            style:
              "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
          }
        : null;

    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Original post
          </h2>
        </div>
        <ReviewDetailCard
          ariaLabel="Original post"
          photoKey={image || itemTitle || imageAlt}
          eyebrow={reportTypeLabel}
          title={itemTitle || imageAlt}
          subtitle={`${reporterName} · ${reporterMeta}`}
          badgeLabel={typeBadge?.label}
          badgeStyle={typeBadge?.style}
          timestampLabel={postedDateLabel}
          photos={image ? [{ src: image, alt: imageAlt }] : []}
          emptyPhotoTitle="No image attached to this report."
          emptyPhotoSubtitle="The reporter did not attach any photos to this post."
          description={notes}
          emptyDescription="No additional description provided."
          facts={heroFacts}
          actions={footer}
        />
      </div>
    );
  }

  return (
    <aside className="rounded-[18px] bg-white p-4 lg:sticky lg:top-6 lg:self-start dark:bg-neutral-900">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
          Original post
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
          {postedDateLabel}
        </span>
      </div>

      <OriginalPostFacts
        image={image}
        imageAlt={imageAlt}
        reporterName={reporterName}
        reporterMeta={reporterMeta}
        facts={facts}
        notes={notes}
      />

      {footer && <div className="mt-4">{footer}</div>}
    </aside>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "Filter by status",
}: {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const pressed = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.key)}
            className={`grow shrink-0 basis-auto whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
              pressed
                ? "bg-[#E5192D] text-white hover:bg-[#c81424]"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span>{option.label}</span>
            <span className="font-mono tabular-nums opacity-80">
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RequestSelectorCard({
  name,
  subtitle,
  status,
  selected,
  matchTones,
  onClick,
}: {
  name: string;
  subtitle: string;
  status: string;
  selected: boolean;
  matchTones?: MatchTone[];
  onClick: () => void;
}) {
  const toneClass: Record<MatchTone, string> = {
    ok: "bg-emerald-600 dark:bg-emerald-500",
    warn: "bg-amber-500 dark:bg-amber-400",
    bad: "bg-rose-500 dark:bg-rose-400",
    na: "bg-neutral-200 dark:bg-neutral-700",
  };

  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] bg-white px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 ${
        selected
          ? "ring-1 ring-[#E5192D]"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {name}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <StatusBadge status={status} />
        {matchTones && matchTones.length > 0 && (
          <span
            className="flex h-[5px] w-[72px] gap-[3px]"
            title="Attribute comparison with original post"
            aria-hidden="true"
          >
            {matchTones.map((tone, index) => (
              <span
                key={index}
                className={`flex-1 rounded-sm ${toneClass[tone]}`}
              />
            ))}
          </span>
        )}
      </div>
    </button>
  );
}

export function ReviewPager({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalItems,
  itemUnitLabel = "requests",
  showRange = true,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  itemUnitLabel?: string;
  showRange?: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalItems === 0 || (!showRange && totalPages <= 1)) return null;

  return (
    <nav
      aria-label="Request pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {showRange && (
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 tabular-nums dark:text-neutral-400">
          Showing {rangeStart}–{rangeEnd} of {totalItems} {itemUnitLabel}
        </span>
      )}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="inline-grid h-8 min-w-8 place-items-center rounded-lg border border-neutral-200 bg-transparent px-2 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNum = index + 1;
            const current = page === pageNum;
            return (
              <button
                key={pageNum}
                type="button"
                aria-current={current ? "page" : undefined}
                aria-label={`Page ${pageNum}`}
                onClick={() => onPageChange(pageNum)}
                className={`inline-grid h-8 min-w-8 place-items-center rounded-lg border px-2 font-mono text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                  current
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="inline-grid h-8 min-w-8 place-items-center rounded-lg border border-neutral-200 bg-transparent px-2 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}

/** Shared horizontal detail card matching the school_user Claims & Returned card design. */
function ReviewDetailCard({
  ariaLabel,
  photoKey,
  eyebrow,
  title,
  subtitle,
  badgeLabel,
  badgeStyle,
  timestampLabel,
  photos,
  emptyPhotoTitle,
  emptyPhotoSubtitle,
  notices,
  description,
  emptyDescription = "No additional details provided.",
  facts,
  actions,
}: {
  ariaLabel: string;
  photoKey: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeStyle?: string;
  timestampLabel: string;
  photos: ReadonlyArray<CarouselPhoto>;
  emptyPhotoTitle: string;
  emptyPhotoSubtitle: string;
  notices?: ReactNode;
  description?: string;
  emptyDescription?: string;
  facts: ReviewFactRow[];
  actions?: ReactNode;
}) {
  const importantFact = facts.find((fact) => fact.id === "important-details");
  const physicalFact = facts.find((fact) => fact.id === "physical-item");
  const gridFacts = facts.filter(
    (fact) => fact.id !== "important-details" && fact.id !== "physical-item",
  );
  const smFillerCount = (3 - (gridFacts.length % 3)) % 3;
  const baseFillerNeeded = gridFacts.length % 2 === 1;

  return (
    <section
      aria-label={ariaLabel}
      className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-900"
    >
      <div className="p-4 sm:p-5">
        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
          <PhotoCarousel
            key={photoKey}
            photos={photos}
            emptyTitle={emptyPhotoTitle}
            emptySubtitle={emptyPhotoSubtitle}
          />
          <article className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {eyebrow}
                </p>
                <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {title}
                </h2>
                <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
                  {subtitle}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {badgeLabel && badgeStyle && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold ${badgeStyle}`}
                  >
                    {badgeLabel}
                  </span>
                )}
                <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                  {timestampLabel}
                </span>
              </div>
            </div>

            {notices}

            <div className="mt-4">
              <h4 className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                Description
              </h4>
              <p className="mt-1 break-words text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                {description?.trim() || emptyDescription}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px border-y border-neutral-200/80 bg-neutral-200/80 text-xs sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
              {gridFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="bg-white px-3 py-3 dark:bg-neutral-900"
                >
                  <dt className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 break-words font-semibold text-neutral-900 dark:text-neutral-100">
                    {fact.value}
                  </dd>
                </div>
              ))}
              {baseFillerNeeded && (
                <div
                  aria-hidden="true"
                  className="bg-white sm:hidden dark:bg-neutral-900"
                />
              )}
              {Array.from({ length: smFillerCount }, (_, index) => (
                <div
                  key={`filler-${index}`}
                  aria-hidden="true"
                  className="hidden bg-white sm:block dark:bg-neutral-900"
                />
              ))}
              {physicalFact && (
                <div className="col-span-full bg-white px-3 py-3 dark:bg-neutral-900">
                  <dt className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {physicalFact.label}
                  </dt>
                  <dd className="mt-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                    {physicalFact.value}
                  </dd>
                </div>
              )}
            </dl>

            {importantFact && (
              <div className="mt-4">
                <h4 className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                  {importantFact.label}
                </h4>
                <div className="mt-1 break-words text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                  {importantFact.value}
                </div>
                {importantFact.note && (
                  <span className="mt-1 block text-xs font-normal text-neutral-400 dark:text-neutral-500">
                    {importantFact.note}
                  </span>
                )}
              </div>
            )}

            {actions && (
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-5">
                {actions}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

/** Shared review card styled identically to the school_user Claims & Returned cards. */
export function SubmittedRequestCard({
  requestKey,
  requestTypeLabel,
  submitted,
  itemTitle,
  applicantName,
  applicantId,
  status,
  photos,
  emptyPhotoSubtitle,
  notices,
  description,
  facts,
  actions,
}: {
  requestKey: string;
  requestTypeLabel: string;
  submitted: string;
  itemTitle: string;
  applicantName: string;
  applicantId: string;
  status: ClaimRequest["status"];
  photos: ReadonlyArray<CarouselPhoto>;
  emptyPhotoSubtitle: string;
  notices?: ReactNode;
  description?: string;
  facts: ReviewFactRow[];
  actions?: ReactNode;
}) {
  const statusLabel = simplifyClaimStatus(status);
  return (
    <ReviewDetailCard
      ariaLabel={`${requestTypeLabel} from ${applicantName}`}
      photoKey={requestKey}
      eyebrow={requestTypeLabel}
      title={itemTitle}
      subtitle={`${applicantName} · ID ${applicantId}`}
      badgeLabel={statusLabel}
      badgeStyle={simplifiedClaimStatusStyles[statusLabel]}
      timestampLabel={`Submitted ${submitted}`}
      photos={photos}
      emptyPhotoTitle="No photo evidence provided"
      emptyPhotoSubtitle={emptyPhotoSubtitle}
      notices={notices}
      description={description}
      facts={facts}
      actions={actions}
    />
  );
}

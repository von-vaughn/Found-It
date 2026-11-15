import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Tag, X, type LucideIcon } from "lucide-react";
import { NoItemImage } from "@/components/NoItemImage";
import { StatusBadge } from "./StatusBadge";
import type { MatchTone } from "./requestComparison";

export interface ReviewStep {
  label: string;
  detail: string;
  state: "done" | "current" | "upcoming";
}

export interface ReviewFactRow {
  id: string;
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
}

export interface ReviewLedgerRow {
  id: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
}

export interface FilterChipOption<T extends string = string> {
  key: T;
  label: string;
  count: number;
}

export function ReviewHeader({
  eyebrow,
  title,
  itemType,
  stateLabel,
  stateTone = "warn",
  subtitle,
  steps,
}: {
  eyebrow: string;
  title: string;
  itemType?: "Lost" | "Found";
  stateLabel: string;
  stateTone?: "ok" | "warn" | "bad" | "neutral";
  subtitle: string;
  steps: ReviewStep[];
}) {
  const stateBadgeClasses: Record<
    NonNullable<typeof stateTone>,
    string
  > = {
    ok: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    bad: "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    neutral:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  };

  return (
    <header className="mb-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
        {eyebrow}
      </p>
      <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-[-0.02em] text-neutral-900 dark:text-neutral-100">
        <span>{title}</span>
        {itemType && <StatusBadge status={itemType} />}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stateBadgeClasses[stateTone]}`}
        >
          {stateLabel}
        </span>
      </h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {subtitle}
      </p>

      <ol className="mt-6 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
        {steps.map((step) => {
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";
          return (
            <li
              key={step.label}
              className={`relative pt-5 pr-3 text-xs ${
                isDone || isCurrent
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-[5px] right-0 left-0 h-[2px] ${
                  isDone || isCurrent
                    ? "bg-emerald-600 dark:bg-emerald-500"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              />
              <span
                aria-hidden="true"
                className={`absolute top-0 left-0 h-3 w-3 rounded-full border-2 ${
                  isDone
                    ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
                    : isCurrent
                      ? "animate-pulse border-emerald-600 bg-white dark:border-emerald-400 dark:bg-neutral-950"
                      : "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                }`}
              />
              <strong className="block text-[13px] font-medium">
                {step.label}
              </strong>
              <span className="mt-0.5 block text-neutral-500 dark:text-neutral-400">
                {step.detail}
              </span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}

export function OriginalPostFacts({
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
    <>
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

      <div className="mt-4">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {reporterName}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {reporterMeta}
        </p>
      </div>

      <dl className="mt-4 border-t border-neutral-200 dark:border-neutral-800">
        {facts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div
              key={fact.id}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-neutral-200 py-2.5 text-sm dark:border-neutral-800"
            >
              <dt className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
                {Icon && (
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                    aria-hidden="true"
                  />
                )}
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
          );
        })}
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-neutral-200 py-2.5 text-sm dark:border-neutral-800">
          <dt className="text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
            Notes
          </dt>
          <dd className="min-w-0 text-xs leading-relaxed font-normal text-neutral-600 dark:text-neutral-400">
            {notes?.trim() || "No additional description provided."}
          </dd>
        </div>
      </dl>
    </>
  );
}

export function OriginalPostCard({
  postedDateLabel,
  image,
  imageAlt,
  reporterName,
  reporterMeta,
  facts,
  notes,
  footer,
}: {
  postedDateLabel: string;
  image?: string;
  imageAlt: string;
  reporterName: string;
  reporterMeta: string;
  facts: ReviewFactRow[];
  notes?: string;
  footer?: ReactNode;
}) {
  return (
    <aside className="rounded-[20px] border border-neutral-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.10)] lg:sticky lg:top-6 lg:self-start dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
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
      className="flex flex-wrap gap-1.5"
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
              pressed
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
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
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border bg-white px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 ${
        selected
          ? "border-[#E5192D] ring-1 ring-[#E5192D]"
          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
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
  onPageChange,
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  itemUnitLabel?: string;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <nav
      aria-label="Request pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 tabular-nums dark:text-neutral-400">
        Showing {rangeStart}–{rangeEnd} of {totalItems} {itemUnitLabel}
      </span>
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

export function SubmittedAnswersLedger({
  submittedByLabel,
  rows,
}: {
  submittedByLabel: string;
  rows: ReviewLedgerRow[];
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
        Submitted details
      </p>
      <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-[135px_minmax(0,1fr)] gap-4 border-b border-neutral-200 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <span>Field</span>
          <span>{submittedByLabel}</span>
        </div>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              className="grid grid-cols-[135px_minmax(0,1fr)] items-start gap-4 border-b border-neutral-200 py-3 text-sm dark:border-neutral-800"
            >
              <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                  aria-hidden="true"
                />
                <span>{row.label}</span>
              </span>
              <div className="min-w-0 font-medium text-neutral-900 dark:text-neutral-100">
                <div className="break-words">{row.value}</div>
                {row.note && (
                  <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {row.note}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OriginalPostButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#E5192D] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
    >
      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
      View original post
    </button>
  );
}

export function OriginalPostDialog({
  open,
  onClose,
  image,
  imageAlt,
  reporterName,
  reporterMeta,
  facts,
  notes,
}: {
  open: boolean;
  onClose: () => void;
  image?: string;
  imageAlt: string;
  reporterName: string;
  reporterMeta: string;
  facts: ReviewFactRow[];
  notes?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="original-post-modal-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(520px,calc(100vw-2rem))] max-h-[calc(100dvh-3rem)] rounded-[24px] border border-neutral-200 bg-white p-0 text-neutral-900 shadow-[0_30px_60px_-20px_rgba(24,24,27,0.25)] backdrop:bg-zinc-900/40 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="original-post-modal-title"
            className="text-[17px] font-semibold tracking-[-0.01em]"
          >
            Original post
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close original post"
            className="inline-grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <OriginalPostFacts
          image={image}
          imageAlt={imageAlt}
          reporterName={reporterName}
          reporterMeta={reporterMeta}
          facts={facts}
          notes={notes}
        />
      </div>
    </dialog>
  );
}

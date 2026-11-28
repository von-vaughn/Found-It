import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Flag, Trash2 } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { NoItemImage } from "@/components/NoItemImage";
import { resolveIdNumber } from "@/lib/idNumber";
import type { ItemFlag } from "@/services/itemService";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { Panel } from "./Panel";
import { formatAdminEventDate, formatAdminEventTime } from "./requestComparison";
import { ReviewPager, type ReviewFactRow } from "./ReviewLayout";
import type { AdminReport } from "./types";

const REPORTED_PAGE_SIZE = 8;
const DELETE_REASON_MAX_LENGTH = 500;

function formatFlagTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateReported(dateValue: string): string {
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue || "Not provided";
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function FlagReasonRow({ flag }: { flag: ItemFlag }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {initialsForName(flag.reporterName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {flag.reporterName}
              </span>
              <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {flag.reporterEmail}
              </span>
            </div>
            <time
              dateTime={flag.createdAt}
              className="font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400"
            >
              {formatFlagTimestamp(flag.createdAt)}
            </time>
          </div>
          <p className="mt-1 break-words text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {flag.reason}
          </p>
        </div>
      </div>
    </li>
  );
}

export function ReportedItemsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading reported items"
      className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] lg:items-start"
    >
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:divide-neutral-800">
        <div className="h-14 border-b border-neutral-100 px-5 dark:border-neutral-800" />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-start gap-3 p-4">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800/70" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div className="h-5 w-40 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-9 w-24 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="aspect-[4/3] w-full rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          <div className="space-y-4">
            <div className="h-6 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800/70" />
            <div className="h-16 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildCanonicalFacts(report: AdminReport): ReviewFactRow[] {
  const isLost = report.type === "Lost";
  const rows: ReviewFactRow[] = [
    {
      id: "color",
      label: "Primary color",
      value: report.color?.trim() || "Not specified",
    },
    {
      id: "location",
      label: "Specific location",
      value: report.specificLocation?.trim() || "Not provided",
    },
    {
      id: "building",
      label: "Building",
      value:
        report.buildingName?.trim() || report.building?.trim() || "Not provided",
    },
    {
      id: "event-date",
      label: isLost ? "Date lost" : "Date found",
      value: formatAdminEventDate(report.eventDateTime),
    },
    {
      id: "event-time",
      label: isLost ? "Time lost" : "Time found",
      value: formatAdminEventTime(report.eventDateTime),
    },
    {
      id: "category",
      label: "Category",
      value: report.category || "Not provided",
    },
    {
      id: "date-reported",
      label: "Date reported",
      value: formatDateReported(report.date),
    },
  ];
  if (report.type === "Found") {
    rows.push({
      id: "physical-item",
      label: "Physical item",
      value: <OsaReceiptStatus received={report.receivedByOsa} />,
    });
  }
  return rows;
}

function ReportedItemDossier({
  activeReport,
  onDismissFlags,
  isDismissingFlags,
  onDeleteReport,
  isDeletingReport,
}: {
  activeReport: AdminReport;
  onDismissFlags: (id: string) => void;
  isDismissingFlags: boolean;
  onDeleteReport: (id: string, reason: string, onSuccess: () => void) => void;
  isDeletingReport: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (confirmingDelete && !dialog.open) dialog.showModal();
    if (!confirmingDelete && dialog.open) dialog.close();
  }, [confirmingDelete]);

  const flagCount = activeReport.flags?.length ?? activeReport.flagCount ?? 0;

  const handleCloseDeleteModal = () => {
    if (isDeletingReport) return;
    setConfirmingDelete(false);
    setDeleteError("");
  };

  const handleConfirmDelete = () => {
    const trimmed = deleteReason.trim();
    if (!trimmed) {
      setDeleteError("Enter a reason for removing this post");
      return;
    }
    onDeleteReport(activeReport.id, trimmed, () => {
      setConfirmingDelete(false);
      setDeleteReason("");
      setDeleteError("");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <Panel
        title={activeReport.type === "Lost" ? "Lost item post" : "Found item post"}
        titleAdornment={
          <span className="font-mono text-xs font-normal text-neutral-500 tabular-nums dark:text-neutral-400">
            · {flagCount} {flagCount === 1 ? "flag" : "flags"}
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isDismissingFlags || isDeletingReport}
              onClick={() => onDismissFlags(activeReport.id)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <Check className="h-4 w-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} aria-hidden="true" />
              {isDismissingFlags ? "Dismissing…" : "Dismiss flags"}
            </button>
            <button
              type="button"
              disabled={isDeletingReport || isDismissingFlags}
              onClick={() => {
                setDeleteError("");
                setConfirmingDelete(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Delete post
            </button>
          </div>
        }
      >
        <div className="p-5 sm:p-6">
          {/* Item Dossier */}
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
            <div className="min-w-0">
              {activeReport.image ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                  <img
                    src={activeReport.image}
                    alt={`${activeReport.title} photo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <NoItemImage
                  title="No image attached"
                  className="aspect-[4/3] w-full rounded-lg"
                />
              )}
            </div>

            <article className="min-w-0">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {activeReport.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Posted by{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {activeReport.reportedBy}
                </span>{" "}
                · ID{" "}
                <span className="font-mono tabular-nums">
                  {resolveIdNumber(
                    activeReport.reporterSchoolId,
                    activeReport.reporterEmail,
                  ) || "N/A"}
                </span>{" "}
                · {activeReport.date}
              </p>

              <div className="mt-4">
                <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Description
                </h3>
                <p className="mt-1 break-words text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {activeReport.description?.trim() ||
                    "No additional description provided"}
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-1 gap-x-6 border-t border-neutral-100 pt-2 text-xs sm:grid-cols-2 dark:border-neutral-800">
                {buildCanonicalFacts(activeReport).map((fact) => (
                  <div key={fact.id} className="min-w-0 py-2.5">
                    <dt className="font-medium text-neutral-500 dark:text-neutral-400">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 break-words font-medium text-neutral-900 dark:text-neutral-100">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>

          {/* Chronological Flag Reasons Log */}
          <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Flag reasons
              </h3>
              <span className="font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                {flagCount} {flagCount === 1 ? "report" : "reports"}
              </span>
            </div>
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {(activeReport.flags ?? []).map((flag) => (
                <FlagReasonRow key={flag.id} flag={flag} />
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {confirmingDelete && (
        <dialog
          ref={deleteDialogRef}
          role="alertdialog"
          aria-labelledby="reported-delete-title"
          aria-describedby="reported-delete-description"
          onCancel={(event) => {
            event.preventDefault();
            handleCloseDeleteModal();
          }}
          onClose={handleCloseDeleteModal}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-neutral-950/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <h3
            id="reported-delete-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Delete this post?
          </h3>
          <p
            id="reported-delete-description"
            className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"
          >
            &ldquo;{activeReport.title}&rdquo; will be permanently deleted, and
            the original reporter will receive this reason in their
            notifications.
          </p>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="reported-delete-reason"
                className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Deletion reason <span className="text-[#E5192D]">*</span>
              </label>
              <span className="font-mono text-[11px] text-neutral-400 tabular-nums dark:text-neutral-500">
                {deleteReason.length}/{DELETE_REASON_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="reported-delete-reason"
              rows={3}
              maxLength={DELETE_REASON_MAX_LENGTH}
              value={deleteReason}
              disabled={isDeletingReport}
              onChange={(event) => {
                setDeleteReason(event.target.value);
                if (deleteError) setDeleteError("");
              }}
              placeholder="Explain why this listing is being removed"
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            {deleteError && (
              <p className="text-xs font-medium text-[#E5192D]" role="alert">
                {deleteError}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={isDeletingReport}
              onClick={handleCloseDeleteModal}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingReport}
              onClick={handleConfirmDelete}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-neutral-900"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {isDeletingReport ? "Deleting…" : "Delete post"}
            </button>
          </div>
        </dialog>
      )}
    </motion.div>
  );
}

export function ReportedItemsView({
  reports,
  allFlaggedCount,
  typeFilter,
  onTypeFilterChange,
  typeCounts,
  selectedId,
  onSelectId,
  onResetFilters,
  onBrowseAllItems,
  onDismissFlags,
  isDismissingFlags,
  onDeleteReport,
  isDeletingReport,
}: {
  reports: AdminReport[];
  allFlaggedCount: number;
  typeFilter: "All" | "Lost" | "Found";
  onTypeFilterChange: (next: "All" | "Lost" | "Found") => void;
  typeCounts: { All: number; Lost: number; Found: number };
  selectedId: string;
  onSelectId: (id: string) => void;
  onResetFilters: () => void;
  onBrowseAllItems: () => void;
  onDismissFlags: (id: string) => void;
  isDismissingFlags: boolean;
  onDeleteReport: (id: string, reason: string, onSuccess: () => void) => void;
  isDeletingReport: boolean;
}) {
  const [page, setPage] = useState(1);
  const [prevFilterKey, setPrevFilterKey] = useState({
    typeFilter,
    total: reports.length,
  });
  if (
    typeFilter !== prevFilterKey.typeFilter ||
    reports.length !== prevFilterKey.total
  ) {
    setPrevFilterKey({ typeFilter, total: reports.length });
    setPage(1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(reports.length / REPORTED_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pagedReports = reports.slice(
    (safePage - 1) * REPORTED_PAGE_SIZE,
    safePage * REPORTED_PAGE_SIZE,
  );
  const rangeStart =
    reports.length === 0 ? 0 : (safePage - 1) * REPORTED_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * REPORTED_PAGE_SIZE, reports.length);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    const nextStart = (nextPage - 1) * REPORTED_PAGE_SIZE;
    const firstOnPage = reports[nextStart];
    if (firstOnPage) {
      onSelectId(firstOnPage.id);
    }
  };

  const activeReport =
    reports.find((entry) => entry.id === selectedId) ?? pagedReports[0] ?? reports[0] ?? null;

  const filterTabs = [
    { key: "All" as const, label: "All reported", count: typeCounts.All },
    { key: "Lost" as const, label: "Lost", count: typeCounts.Lost },
    { key: "Found" as const, label: "Found", count: typeCounts.Found },
  ];

  return (
    <div className="space-y-4">
      <FadeIn>
        <div
          role="tablist"
          aria-label="Filter reported items by post type"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {filterTabs.map((tab) => {
            const active = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTypeFilterChange(tab.key)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                  active
                    ? "bg-[#E5192D] text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </FadeIn>

      {reports.length === 0 ? (
        <FadeIn delay={0.05}>
          <Panel
            title="Flagged queue"
            action={
              <span className="font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                0 items
              </span>
            }
          >
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {allFlaggedCount === 0
                  ? "No reported items right now"
                  : "No reported items match your filters"}
              </h2>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {allFlaggedCount === 0
                  ? "When campus users flag a lost or found listing for review, it appears here with every submitted reason."
                  : "Try clearing the search query or switching post type filters to inspect all flagged reports."}
              </p>
              <button
                type="button"
                onClick={allFlaggedCount === 0 ? onBrowseAllItems : onResetFilters}
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {allFlaggedCount === 0 ? "View all item reports" : "Reset filters"}
              </button>
            </div>
          </Panel>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          <FadeIn delay={0.05} className="min-w-0">
            <Panel
              title="Flagged queue"
              action={
                <span className="font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {reports.length} {reports.length === 1 ? "item" : "items"}
                </span>
              }
            >
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pagedReports.map((report) => {
                  const isSelected = activeReport?.id === report.id;
                  const flagCount =
                    report.flags?.length ?? report.flagCount ?? 0;
                  const latestFlag = report.flags?.[0];
                  return (
                    <button
                      key={report.id}
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => onSelectId(report.id)}
                      className={`relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
                        isSelected
                          ? "bg-neutral-50 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[#E5192D] dark:bg-neutral-800/60"
                          : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                      }`}
                    >
                      {report.image ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                          <img
                            src={report.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-500">
                          <Flag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {report.title}
                          </p>
                          <span className="shrink-0 font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                            {flagCount} {flagCount === 1 ? "flag" : "flags"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {report.type} · {report.reportedBy} · {report.date}
                        </p>
                        {latestFlag?.reason && (
                          <p className="mt-1 line-clamp-1 text-xs text-neutral-600 dark:text-neutral-300">
                            {latestFlag.reason}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <ReviewPager
                  page={safePage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalItems={reports.length}
                  itemUnitLabel={reports.length === 1 ? "item" : "items"}
                  showRange
                  onPageChange={handlePageChange}
                />
              </div>
            </Panel>
          </FadeIn>

          {activeReport && (
            <section
              aria-label="Selected reported item details"
              className="min-w-0"
            >
              <AnimatePresence mode="wait">
                <ReportedItemDossier
                  key={activeReport.id}
                  activeReport={activeReport}
                  onDismissFlags={onDismissFlags}
                  isDismissingFlags={isDismissingFlags}
                  onDeleteReport={onDeleteReport}
                  isDeletingReport={isDeletingReport}
                />
              </AnimatePresence>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

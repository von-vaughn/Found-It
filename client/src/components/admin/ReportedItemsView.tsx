import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Flag,
  MapPin,
  Package,
  Palette,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { NoItemImage } from "@/components/NoItemImage";
import { resolveIdNumber } from "@/lib/idNumber";
import type { ItemFlag } from "@/services/itemService";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { formatAdminEventDate, formatAdminEventTime } from "./requestComparison";
import { FilterChips, type ReviewFactRow } from "./ReviewLayout";
import type { AdminReport } from "./types";

const DELETE_REASON_PRESETS = [
  "Spam",
  "Duplicate report",
  "Inappropriate content",
  "False information",
];

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
    <li className="py-4 first:pt-2 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-[11px] font-bold tracking-tight text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          {initialsForName(flag.reporterName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {flag.reporterName}
              </span>
              <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {flag.reporterEmail}
              </span>
            </div>
            <time
              dateTime={flag.createdAt}
              className="font-mono text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400"
            >
              {formatFlagTimestamp(flag.createdAt)}
            </time>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-700 break-words dark:text-neutral-300">
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
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:divide-neutral-800">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-start gap-3.5 p-4 animate-pulse">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800/70" />
              <div className="h-3 w-5/6 rounded bg-neutral-100 dark:bg-neutral-800/70" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 animate-pulse dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5 dark:border-neutral-800">
          <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-9 w-28 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="aspect-[4/3] w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-4">
            <div className="h-6 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800/70" />
            <div className="h-16 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="h-10 rounded bg-neutral-100 dark:bg-neutral-800/70" />
              <div className="h-10 rounded bg-neutral-100 dark:bg-neutral-800/70" />
              <div className="h-10 rounded bg-neutral-100 dark:bg-neutral-800/70" />
              <div className="h-10 rounded bg-neutral-100 dark:bg-neutral-800/70" />
            </div>
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
      icon: Palette,
      label: "Primary color",
      value: report.color?.trim() || "Not specified",
    },
    {
      id: "location",
      icon: MapPin,
      label: "Specific location",
      value: report.specificLocation?.trim() || "Not provided",
    },
    {
      id: "building",
      icon: Building2,
      label: "Building",
      value: report.buildingName?.trim() || report.building?.trim() || "Not provided",
    },
    {
      id: "event-date",
      icon: CalendarDays,
      label: isLost ? "Date lost" : "Date found",
      value: formatAdminEventDate(report.eventDateTime),
    },
    {
      id: "event-time",
      icon: Clock3,
      label: isLost ? "Time lost" : "Time found",
      value: formatAdminEventTime(report.eventDateTime),
    },
    {
      id: "category",
      icon: Tag,
      label: "Category",
      value: report.category || "Not provided",
    },
    {
      id: "date-reported",
      icon: CalendarDays,
      label: "Date reported",
      value: formatDateReported(report.date),
    },
  ];
  if (report.type === "Found") {
    rows.push({
      id: "physical-item",
      icon: Package,
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

  const handleConfirmDelete = () => {
    const trimmed = deleteReason.trim();
    if (!trimmed) {
      setDeleteError("Please provide a reason for deleting this reported post.");
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-[20px] border border-neutral-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.10)] sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#E5192D] tabular-nums dark:border-red-500/30 dark:bg-red-950/40">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            {(activeReport.flags?.length ?? activeReport.flagCount ?? 0)}{" "}
            {(activeReport.flags?.length ?? activeReport.flagCount ?? 0) === 1
              ? "user report"
              : "user reports"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isDismissingFlags || isDeletingReport}
            onClick={() => onDismissFlags(activeReport.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {isDismissingFlags ? "Dismissing…" : "Dismiss flags"}
          </button>
          <button
            type="button"
            disabled={isDeletingReport || isDismissingFlags}
            onClick={() => {
              setDeleteError("");
              setConfirmingDelete((prev) => !prev);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete post
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {confirmingDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-950/20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#E5192D]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Remove &ldquo;{activeReport.title}&rdquo;?
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                      The original reporter will receive this reason in their notifications and this post will be permanently deleted.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {DELETE_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDeleteReason(preset);
                          setDeleteError("");
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-[0.98] ${
                          deleteReason === preset
                            ? "border-[#E5192D] bg-[#E5192D] text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="reported-delete-reason"
                      className="text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                    >
                      Deletion reason <span className="text-[#E5192D]">*</span>
                    </label>
                    <textarea
                      id="reported-delete-reason"
                      rows={2}
                      maxLength={DELETE_REASON_MAX_LENGTH}
                      value={deleteReason}
                      onChange={(event) => {
                        setDeleteReason(event.target.value);
                        if (deleteError) setDeleteError("");
                      }}
                      placeholder="Explain why this listing is being removed…"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                    {deleteError && (
                      <p className="text-xs font-medium text-[#E5192D]" role="alert">
                        {deleteError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDeletingReport}
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeleteError("");
                      }}
                      className="inline-flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingReport}
                      onClick={handleConfirmDelete}
                      className="inline-flex h-8 items-center rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isDeletingReport ? "Deleting…" : "Confirm delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
        <div className="min-w-0">
          {activeReport.image ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
              <img
                src={activeReport.image}
                alt={`${activeReport.title} photo`}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <NoItemImage
              title="No image attached to this report."
              className="aspect-[4/3] w-full rounded-2xl"
            />
          )}
        </div>

        <article className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            {activeReport.title}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Posted by {activeReport.reportedBy} · ID{" "}
            {resolveIdNumber(
              activeReport.reporterSchoolId,
              activeReport.reporterEmail,
            ) || "N/A"}{" "}
            · {activeReport.date}
          </p>

          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            {activeReport.type === "Lost"
              ? "Lost item report"
              : "Found item report"}
          </p>
          <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-neutral-100">
            Description
          </p>
          <p className="mt-1 break-words text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {activeReport.description?.trim() ||
              "No additional description provided."}
          </p>

          <dl className="mt-5 grid grid-cols-1 gap-x-6 border-y border-neutral-200/80 text-xs sm:grid-cols-2 dark:border-neutral-800">
            {buildCanonicalFacts(activeReport).map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.id} className="flex items-start gap-2.5 py-3">
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
                  </div>
                </div>
              );
            })}
          </dl>
        </article>
      </div>

      <div className="mt-6 border-t border-neutral-200/80 pt-5 dark:border-neutral-800">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Submitted flag reasons ({activeReport.flags?.length ?? 0})
        </h3>
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          {(activeReport.flags ?? []).map((flag) => (
            <FlagReasonRow key={flag.id} flag={flag} />
          ))}
        </ul>
      </div>
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
  const activeReport =
    reports.find((entry) => entry.id === selectedId) ?? reports[0] ?? null;

  const filterChips = [
    { key: "All" as const, label: "All reported", count: typeCounts.All },
    { key: "Lost" as const, label: "Lost", count: typeCounts.Lost },
    { key: "Found" as const, label: "Found", count: typeCounts.Found },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <header className="pb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
              Reported items
            </h1>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChips
            options={filterChips}
            value={typeFilter}
            onChange={onTypeFilterChange}
            ariaLabel="Filter reported items by post type"
          />
        </div>
      </FadeIn>

      {reports.length === 0 ? (
        <FadeIn delay={0.05}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-14 text-center dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-bold text-neutral-900 dark:text-neutral-100">
            {allFlaggedCount === 0
              ? "No reported items right now"
              : "No reported items match your filters"}
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
            {allFlaggedCount === 0
              ? "When campus users flag a lost or found listing for review, it appears here with every submitted reason."
              : "Try clearing the search query or switching post type filters to inspect all flagged reports."}
          </p>
          <button
            type="button"
            onClick={allFlaggedCount === 0 ? onBrowseAllItems : onResetFilters}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            {allFlaggedCount === 0 ? "View all item reports" : "Reset filters"}
          </button>
        </div>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          <FadeIn delay={0.05} className="min-w-0">
          <section aria-label="Flagged items queue" className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:divide-neutral-800">
              {reports.map((report) => {
                const isSelected = activeReport?.id === report.id;
                const flagCount = report.flags?.length ?? report.flagCount ?? 0;
                const latestFlag = report.flags?.[0];
                return (
                  <button
                    key={report.id}
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => onSelectId(report.id)}
                    className={`flex w-full items-start gap-3.5 p-4 text-left transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
                      isSelected
                        ? "border-l-2 border-l-[#E5192D] bg-red-50/45 dark:bg-red-950/20"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {report.image ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                        <img
                          src={report.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-500">
                        <Flag className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {report.title}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold text-[#E5192D] tabular-nums dark:border-red-500/30 dark:bg-red-950/40">
                          <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                          {flagCount}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {report.type} · {report.reportedBy} · {report.date}
                      </p>
                      {latestFlag?.reason && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-neutral-600 dark:text-neutral-300">
                          {latestFlag.reason}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          </FadeIn>

          {activeReport && (
            <section aria-label="Selected reported item details" className="min-w-0">
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

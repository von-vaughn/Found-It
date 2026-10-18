import { useState } from "react";
import { useEffect, useRef, type RefObject } from "react";
import { Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { NoItemImage } from "@/components/NoItemImage";
import type { AdminReport } from "./types";

function formatEventDate(report: AdminReport): string {
  const eventDate = report.eventDateTime
    ? new Date(report.eventDateTime)
    : new Date(`${report.date}T12:00:00`);
  if (Number.isNaN(eventDate.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
  }).format(eventDate);
}

function formatEventTime(report: AdminReport): string {
  if (!report.eventDateTime) return "Not provided";

  const eventDate = new Date(report.eventDateTime);
  if (Number.isNaN(eventDate.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-PH", {
    timeStyle: "short",
  }).format(eventDate);
}

const DELETE_REASON_PRESETS = [
  "Spam",
  "Duplicate report",
  "Inappropriate content",
  "False information",
];

const DELETE_REASON_MAX_LENGTH = 500;

export function ItemDetailsDialog({
  report,
  dialogRef,
  onClose,
  onDelete,
}: {
  report: AdminReport | null;
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onDelete?: (id: string, reason?: string) => void;
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

  if (!report) return null;

  const handleDeleteClick = () => {
    setDeleteError("");
    setConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    setConfirmingDelete(false);
    setDeleteError("");
  };

  const handleConfirmDelete = () => {
    if (!onDelete) return;
    const reason = deleteReason.trim();
    if (!reason) {
      setDeleteError("Please provide a reason for deleting this report.");
      return;
    }
    onDelete(report.id, reason);
    toast.success("Item report deleted.");
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="item-details-title"
      onClose={onClose}
      className={`relative m-auto max-h-[min(90dvh,800px)] w-[min(640px,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-white dark:bg-neutral-900 p-0 text-neutral-900 dark:text-neutral-100 shadow-xl backdrop:bg-neutral-950/50 ${
        confirmingDelete ? "border-transparent" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {report.type} item · {report.id}
          </p>
          <h2
            id="item-details-title"
            className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100"
          >
            {report.title}
          </h2>
          <p className="mt-1 text-xs font-medium text-neutral-800 dark:text-neutral-200">
            Reported by {report.reportedBy}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {report.reporterEmail}
          </p>
        </div>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Close item details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
      <div className="space-y-5 p-5">
        {report.image ? (
          <img
            src={report.image}
            alt={report.title}
            className="max-h-72 w-full rounded-lg bg-neutral-50 dark:bg-neutral-800 object-contain"
          />
        ) : (
          <NoItemImage
            title="No item photo provided"
            subtitle="This report did not include any photos of the item."
            className="h-48"
          />
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {report.description}
        </p>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">Category</dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {report.category}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">Building</dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {report.building}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">Specific location</dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {report.specificLocation || "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">Color</dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {report.color || "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">Date reported</dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {new Intl.DateTimeFormat("en", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(`${report.date}T12:00:00`))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {report.type === "Lost" ? "Date lost" : "Date found"}
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {formatEventDate(report)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {report.type === "Lost" ? "Time lost" : "Time found"}
            </dt>
            <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
              {formatEventTime(report)}
            </dd>
          </div>
        </dl>
        {onDelete && (
          <div className="flex justify-end border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 px-3 text-xs font-semibold text-red-700 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete report
            </button>
          </div>
        )}
      </div>
      {onDelete && confirmingDelete && (
        <dialog
          ref={deleteDialogRef}
          role="alertdialog"
          aria-labelledby="delete-report-title"
          aria-describedby="delete-report-description"
          onCancel={(event) => {
            event.preventDefault();
            handleCancelDelete();
          }}
          onClose={handleCancelDelete}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 text-neutral-900 dark:text-neutral-100 shadow-xl backdrop:bg-neutral-950/50"
        >
            <h3
              id="delete-report-title"
              className="text-base font-bold text-neutral-900 dark:text-neutral-100"
            >
              Delete this report?
            </h3>
            <p
              id="delete-report-description"
              className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"
            >
              &ldquo;{report.title}&rdquo; will be permanently removed. This
              cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {DELETE_REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDeleteReason(preset);
                    setDeleteError("");
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 ${
                    deleteReason === preset
                      ? "border-[#E5192D] bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <label
              htmlFor="delete-report-reason"
              className="mt-3 block text-xs font-semibold text-neutral-800 dark:text-neutral-200"
            >
              Reason for deletion{" "}
              <span className="font-normal text-neutral-400 dark:text-neutral-500">(required)</span>
            </label>
            <textarea
              id="delete-report-reason"
              autoFocus
              rows={4}
              value={deleteReason}
              maxLength={DELETE_REASON_MAX_LENGTH}
              onChange={(event) => {
                setDeleteReason(event.target.value);
                if (deleteError) setDeleteError("");
              }}
              placeholder="e.g. Duplicate of an existing report…"
              aria-invalid={deleteError ? true : undefined}
              aria-describedby={deleteError ? "delete-reason-error" : undefined}
 className="mt-1.5 w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              {deleteError ? (
                <p
                  id="delete-reason-error"
                  role="alert"
                  className="text-[11px] font-medium text-red-600"
                >
                  {deleteError}
                </p>
              ) : (
                <span />
              )}
              <span className="shrink-0 text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
                {deleteReason.length}/{DELETE_REASON_MAX_LENGTH}
              </span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete report
              </button>
            </div>
        </dialog>
      )}
    </dialog>
  );
}

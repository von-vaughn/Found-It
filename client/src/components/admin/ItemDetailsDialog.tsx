import type { RefObject } from "react";
import { Package, X } from "lucide-react";
import type { AdminReport } from "./types";

export function ItemDetailsDialog({
  report,
  dialogRef,
  onClose,
}: {
  report: AdminReport | null;
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  if (!report) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="item-details-title"
      onClose={onClose}
      className="m-auto max-h-[min(90dvh,800px)] w-[min(640px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-950/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            {report.type} item · {report.id}
          </p>
          <h2
            id="item-details-title"
            className="mt-1 text-lg font-bold text-neutral-900"
          >
            {report.title}
          </h2>
        </div>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Close item details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
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
            className="max-h-72 w-full rounded-lg bg-neutral-50 object-contain"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-48 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
          >
            <Package className="h-8 w-8" />
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {report.description}
        </p>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-neutral-100 pt-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] text-neutral-500">Category</dt>
            <dd className="mt-1 font-semibold text-neutral-800">
              {report.category}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500">Building</dt>
            <dd className="mt-1 font-semibold text-neutral-800">
              {report.building}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500">Color</dt>
            <dd className="mt-1 font-semibold text-neutral-800">
              {report.color || "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500">Reported by</dt>
            <dd className="mt-1 font-semibold text-neutral-800">
              {report.reportedBy}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-neutral-500">Date reported</dt>
            <dd className="mt-1 font-semibold text-neutral-800">
              {new Intl.DateTimeFormat("en", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(`${report.date}T12:00:00`))}
            </dd>
          </div>
        </dl>
      </div>
    </dialog>
  );
}

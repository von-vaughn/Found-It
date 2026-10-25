import { useEffect, useRef } from "react";
import { StatusBadge } from "./StatusBadge";
import { OsaReceiptStatus } from "./OsaReceiptStatus";
import { NoItemImage } from "@/components/NoItemImage";
import type { AdminReport } from "./types";

export function ItemTable({
  rows,
  onViewDetails,
  wholeRowClickable = false,
  showColumnHeadings = true,
  fitViewport = false,
  onVisibleRowsChange,
}: {
  rows: AdminReport[];
  onViewDetails: (report: AdminReport) => void;
  wholeRowClickable?: boolean;
  showColumnHeadings?: boolean;
  fitViewport?: boolean;
  onVisibleRowsChange?: (count: number) => void;
}) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fitViewport || !onVisibleRowsChange) return;
    const container = tableContainerRef.current;
    if (!container) return;

    const updateVisibleRows = () => {
      const headerHeight =
        container.querySelector("thead")?.getBoundingClientRect().height ?? 40;
      const rowHeight =
        container.querySelector("tbody tr")?.getBoundingClientRect().height ??
        76;
      const availableRows = Math.max(
        1,
        Math.floor((container.clientHeight - headerHeight) / rowHeight),
      );
      onVisibleRowsChange(availableRows);
    };

    updateVisibleRows();
    const observer = new ResizeObserver(updateVisibleRows);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitViewport, onVisibleRowsChange, rows.length]);

  if (rows.length === 0) {
    return (
      <div
        className={`flex items-center justify-center px-5 py-10 ${
          fitViewport ? "min-h-0 flex-1" : "min-h-[800px]"
        }`}
      >
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          No reports match these filters.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className={`overflow-x-auto ${
        fitViewport ? "min-h-0 flex-1" : "min-h-[800px]"
      }`}
    >
      <table className="w-full min-w-[1260px] text-left text-xs">
        <thead
          className={
            showColumnHeadings
              ? "bg-neutral-50 dark:bg-neutral-800/60 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              : "sr-only"
          }
        >
          <tr>
            <th scope="col" className="px-5 py-3">
              Item name
            </th>
            <th scope="col" className="px-4 py-3">
              Physical Item
            </th>
            <th scope="col" className="max-w-72 px-4 py-3">
              Description
            </th>
            <th scope="col" className="px-4 py-3">
              Category
            </th>
            <th scope="col" className="px-4 py-3">
              Building
            </th>
            <th scope="col" className="px-4 py-3">
              Color
            </th>
            <th scope="col" className="px-4 py-3">
              Reported by
            </th>
            <th scope="col" className="px-4 py-3">
              Date
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            {!wholeRowClickable && (
              <th scope="col" className="px-5 py-3">
                Details
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={wholeRowClickable ? 0 : undefined}
              aria-label={
                wholeRowClickable
                  ? `Open full details for ${row.title}`
                  : undefined
              }
              aria-keyshortcuts={wholeRowClickable ? "Enter Space" : undefined}
              onClick={
                wholeRowClickable ? () => onViewDetails(row) : undefined
              }
              onKeyDown={
                wholeRowClickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onViewDetails(row);
                      }
                    }
                  : undefined
              }
              className={`text-neutral-700 dark:text-neutral-300 ${
                wholeRowClickable
                  ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-[#E5192D] focus-visible:outline-offset-[-2px]"
                  : ""
              }`}
            >
              <td className="px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  {row.image ? (
                    <img
                      src={row.image}
                      alt={`${row.title} item`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <NoItemImage compact className="h-12 w-12" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-neutral-900 dark:text-neutral-100">
                      {row.title}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                {row.type === "Found" ? (
                  <OsaReceiptStatus received={row.receivedByOsa} />
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-500">—</span>
                )}
              </td>
              <td className="max-w-72 px-4 py-3.5">
                <span className="line-clamp-2 leading-relaxed">
                  {row.description}
                </span>
              </td>
              <td className="px-4 py-3.5 capitalize">{row.category}</td>
              <td className="max-w-40 px-4 py-3.5">
                <span className="block truncate">{row.building}</span>
              </td>
              <td className="px-4 py-3.5">{row.color || "—"}</td>
              <td className="px-4 py-3.5">{row.reportedBy}</td>
              <td className="whitespace-nowrap px-4 py-3.5">
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(`${row.date}T12:00:00`))}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={row.status} />
              </td>
              {!wholeRowClickable && (
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => onViewDetails(row)}
                    aria-label={`View details for ${row.title}`}
                    className="inline-flex h-8 items-center rounded-md border border-neutral-200 dark:border-neutral-700 px-3 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    View details
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

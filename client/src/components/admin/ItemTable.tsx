import { Package } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { AdminReport } from "./types";

export function ItemTable({
  rows,
  onViewDetails,
  wholeRowClickable = false,
  showColumnHeadings = true,
}: {
  rows: AdminReport[];
  onViewDetails: (report: AdminReport) => void;
  wholeRowClickable?: boolean;
  showColumnHeadings?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-neutral-500">
        No reports match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-xs">
        <thead
          className={
            showColumnHeadings
              ? "bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
              : "sr-only"
          }
        >
          <tr>
            <th scope="col" className="px-5 py-3">
              Item name
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
        <tbody className="divide-y divide-neutral-100">
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
              className={`text-neutral-700 ${
                wholeRowClickable
                  ? "cursor-pointer hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-[#E5192D] focus-visible:outline-offset-[-2px]"
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
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                    >
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-neutral-900">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-neutral-400">
                      {row.id}
                    </span>
                  </span>
                </div>
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
                    className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
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

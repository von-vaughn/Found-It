import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SuperAdminLayout } from "./SuperAdminLayout";
import {
  actionLabel,
  entityTypeLabel,
  filterAuditLogs,
  loadAuditLogs,
} from "@/lib/auditLog";

const PAGE_SIZE = 10;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuditLogsPage() {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All actions");
  const [entityFilter, setEntityFilter] = useState("All reports");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs] = useState(loadAuditLogs);

  const filtered = useMemo(
    () => filterAuditLogs(logs, { query, action: actionFilter, entityType: entityFilter }),
    [logs, query, actionFilter, entityFilter],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const exportCsv = () => {
    const header = [
      "timestamp",
      "admin_name",
      "admin_email",
      "admin_role",
      "action",
      "report_type",
      "report_id",
      "item_title",
      "details",
    ];
    const rows = filtered.map((log) =>
      [
        log.timestamp,
        log.adminName,
        log.adminEmail,
        log.adminRole,
        log.action,
        log.entityType,
        log.entityId,
        log.itemTitle,
        (log.details ?? "").replace(/\s+/g, " ").trim(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "foundit-audit-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminLayout
      activeSection="audit"
      showSearch
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setCurrentPage(1);
      }}
      searchPlaceholder="Search by admin, report ID, or item…"
    >
      <Panel
        title="Who approved or rejected what"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{filtered.length} events</span>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="audit-action-filter">
              Filter by decision
            </label>
            <select
              id="audit-action-filter"
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All actions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
              <option value="claimed">Claimed</option>
            </select>
            <label className="sr-only" htmlFor="audit-entity-filter">
              Filter by report type
            </label>
            <select
              id="audit-entity-filter"
              value={entityFilter}
              onChange={(event) => {
                setEntityFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All reports</option>
              <option>Claim</option>
              <option>Return</option>
              <option>Item</option>
            </select>
          </div>
        </div>

        {pageLogs.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center px-5 py-10">
            <p className="text-center text-sm text-neutral-500">
              No audit events match these filters.
            </p>
          </div>
        ) : (
          <div className="min-h-[400px] overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Admin</th>
                  <th scope="col" className="px-4 py-3">Decision</th>
                  <th scope="col" className="px-4 py-3">Report</th>
                  <th scope="col" className="px-4 py-3">Details</th>
                  <th scope="col" className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageLogs.map((log) => (
                  <tr key={log.id} className="text-neutral-700">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white"
                        >
                          {initials(log.adminName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-neutral-900">
                            {log.adminName}
                          </span>
                          <span className="block truncate text-[11px] text-neutral-500">
                            {log.adminEmail} · {log.adminRole}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={actionLabel(log.action)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block font-semibold text-neutral-900">
                        {log.itemTitle}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-neutral-500">
                        {entityTypeLabel(log.entityType)} · {log.entityId}
                      </span>
                    </td>
                    <td className="max-w-72 px-4 py-3.5">
                      <span className="line-clamp-2 leading-relaxed">
                        {log.details || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filtered.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index + 1}
                  type="button"
                  onClick={() => setCurrentPage(index + 1)}
                  aria-label={`Page ${index + 1}`}
                  aria-current={page === index + 1 ? "page" : undefined}
                  className={`h-7 min-w-7 rounded-md px-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                    page === index + 1
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Panel>
    </SuperAdminLayout>
  );
}

export default AuditLogsPage;

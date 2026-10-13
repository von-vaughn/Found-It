import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ItemTable } from "@/components/admin/ItemTable";
import { Panel } from "@/components/admin/Panel";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { itemToAdminReport } from "@/components/admin/adminData";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import type { Item } from "@/data/mockItems";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { SuperAdminLayout } from "./SuperAdminLayout";
import { useSelectedReport } from "./useSelectedReport";
import { useAuth } from "@/context/useAuth";
import { appendAuditLog, loadAuditLogs } from "@/lib/auditLog";

const PAGE_SIZE = 10;

export function SuperAdminReportsPage({
  items,
  onAddItem,
  onDeleteItem,
}: {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onDeleteItem: (id: string, reason?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [buildingFilter, setBuildingFilter] = useState("All buildings");
  const [currentPage, setCurrentPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();
  const { user } = useAuth();
  const reports = useMemo(() => items.map(itemToAdminReport), [items]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      if (statusFilter !== "All statuses" && report.status !== statusFilter) {
        return false;
      }
      if (
        categoryFilter !== "All categories" &&
        !ITEM_CATEGORIES.some(
          (category) =>
            category.id === categoryFilter &&
            report.category === category.label,
        )
      ) {
        return false;
      }
      if (
        buildingFilter !== "All buildings" &&
        ![report.building, report.specificLocation].some((location) =>
          location.toLowerCase().includes(buildingFilter.toLowerCase()),
        )
      ) {
        return false;
      }
      if (!normalizedQuery) return true;

      return [
        report.title,
        report.description,
        report.category,
        report.building,
        report.color,
        report.reportedBy,
        report.id,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [buildingFilter, categoryFilter, query, reports, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const rangeStart =
    filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredRows.length);

  const updateQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const handleDelete = (id: string, reason?: string) => {
    const target = reports.find((r) => r.id === id);
    appendAuditLog(loadAuditLogs(), {
      adminId: user?.id ?? "superadmin-demo",
      adminName: user?.name ?? "System Owner",
      adminEmail: user?.email ?? "owner@wmsu.edu.ph",
      adminRole: "super_admin",
      action: "rejected",
      entityType: "item",
      entityId: id,
      itemTitle: target?.title ?? id,
      details: reason ? `Report removed: ${reason}` : "Report removed by super admin.",
    });
    onDeleteItem(id, reason);
    setSelectedReport(null);
  };

  return (
    <SuperAdminLayout
      activeSection="items"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search lost and found reports…"
    >
      <Panel
        title="Item reports"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {filteredRows.length} reports
            </span>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Report an item
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="superadmin-report-status-filter">
              Filter by status
            </label>
            <select
              id="superadmin-report-status-filter"
              name="report-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All statuses</option>
              <option>Lost</option>
              <option>Found</option>
              <option>Returned</option>
              <option>Claimed</option>
            </select>

            <label className="sr-only" htmlFor="superadmin-report-category-filter">
              Filter by category
            </label>
            <select
              id="superadmin-report-category-filter"
              name="report-category"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 max-w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option value="All categories">All categories</option>
              {ITEM_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="superadmin-report-building-filter">
              Filter by building
            </label>
            <select
              id="superadmin-report-building-filter"
              name="report-building"
              value={buildingFilter}
              onChange={(event) => {
                setBuildingFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 max-w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option value="All buildings">All buildings</option>
              {ITEM_BUILDINGS.map((building) => (
                <option key={building}>{building}</option>
              ))}
            </select>
          </div>
        </div>

        <ItemTable
          rows={pageRows}
          onViewDetails={setSelectedReport}
          wholeRowClickable
        />

        <div className="flex flex-col gap-3 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filteredRows.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
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
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() =>
                  setCurrentPage((value) => Math.min(pageCount, value + 1))
                }
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Panel>

      {selectedReport && (
        <ItemDetailsDialog
          key={selectedReport.id}
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
          onDelete={handleDelete}
        />
      )}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={onAddItem}
        initialType="lost"
      />
    </SuperAdminLayout>
  );
}

export default SuperAdminReportsPage;

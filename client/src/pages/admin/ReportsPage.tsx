import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ItemTable } from "@/components/admin/ItemTable";
import { Panel } from "@/components/admin/Panel";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { adminReports } from "@/components/admin/adminData";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { AdminLayout } from "./AdminLayout";
import { useSelectedReport } from "./useSelectedReport";

const PAGE_SIZE = 10;

export function ReportsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [buildingFilter, setBuildingFilter] = useState("All buildings");
  const [currentPage, setCurrentPage] = useState(1);
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adminReports.filter((report) => {
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
  }, [buildingFilter, categoryFilter, query, statusFilter]);

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

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const updateCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const updateBuildingFilter = (value: string) => {
    setBuildingFilter(value);
    setCurrentPage(1);
  };

  return (
    <AdminLayout
      activeSection="items"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search lost and found reports…"
    >
      <Panel
        title="Item reports"
        action={
          <span className="text-xs text-neutral-500">
            {filteredRows.length} reports
          </span>
        }
      >
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="report-status-filter">
              Filter by status
            </label>
            <select
              id="report-status-filter"
              name="report-status"
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
              className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All statuses</option>
              <option>Lost</option>
              <option>Found</option>
              <option>Returned</option>
              <option>Claimed</option>
            </select>

            <label className="sr-only" htmlFor="report-category-filter">
              Filter by category
            </label>
            <select
              id="report-category-filter"
              name="report-category"
              value={categoryFilter}
              onChange={(event) => updateCategoryFilter(event.target.value)}
              className="h-9 max-w-48 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option value="All categories">All categories</option>
              {ITEM_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="report-building-filter">
              Filter by building
            </label>
            <select
              id="report-building-filter"
              name="report-building"
              value={buildingFilter}
              onChange={(event) => updateBuildingFilter(event.target.value)}
              className="h-9 max-w-48 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
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

        <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filteredRows.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
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
                onClick={() =>
                  setCurrentPage((value) => Math.min(pageCount, value + 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Panel>

      {selectedReport && (
        <ItemDetailsDialog
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AdminLayout>
  );
}

export default ReportsPage;

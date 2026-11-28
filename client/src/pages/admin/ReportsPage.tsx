import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ListFilter, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { FilterOptionsModal } from "@/components/admin/FilterOptionsModal";
import { ItemTable } from "@/components/admin/ItemTable";
import { Panel } from "@/components/admin/Panel";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { useBuildings } from "@/hooks/useBuildings";
import { formatCategoryLabel, useCategories } from "@/hooks/useCategories";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useSelectedReport } from "@/components/admin/useSelectedReport";
import {
  useDeleteItem,
  useInfiniteItems,
  useUpdateOsaReceipt,
} from "@/hooks/useItems";
import { LoadMoreButton } from "@/components/LoadMoreButton";

export function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") ?? "All statuses",
  );
  const [osaReceiptFilter, setOsaReceiptFilter] = useState(
    () => searchParams.get("osa") ?? "All found items",
  );
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get("category") ?? "All categories",
  );
  const [buildingFilter, setBuildingFilter] = useState(
    () => searchParams.get("building") ?? "All buildings",
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query) next.set("q", query);
    else next.delete("q");
    if (statusFilter !== "All statuses") next.set("status", statusFilter);
    else next.delete("status");
    if (osaReceiptFilter !== "All found items") next.set("osa", osaReceiptFilter);
    else next.delete("osa");
    if (categoryFilter !== "All categories") next.set("category", categoryFilter);
    else next.delete("category");
    if (buildingFilter !== "All buildings") next.set("building", buildingFilter);
    else next.delete("building");
    if (currentPage > 1) next.set("page", String(currentPage));
    else next.delete("page");
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  }, [
    buildingFilter,
    categoryFilter,
    currentPage,
    osaReceiptFilter,
    query,
    searchParams,
    setSearchParams,
    statusFilter,
  ]);
  const [pageSize, setPageSize] = useState(5);
  const [filterOptionsOpen, setFilterOptionsOpen] = useState(false);
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();
  const {
    items,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteItems(undefined, 50);
  const { data: buildings } = useBuildings();
  const { data: categories } = useCategories();
  const buildingOptions = buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;
  const categoryOptions = useMemo(
    () =>
      categories
        ? categories.map((entry) => ({
            id: entry.name,
            label: formatCategoryLabel(entry.name),
          }))
        : ITEM_CATEGORIES,
    [categories],
  );
  const reports = useMemo(() => items.map(serverItemToAdminReport), [items]);
  const deleteItem = useDeleteItem();
  const updateOsaReceipt = useUpdateOsaReceipt();

  const handleOsaReceiptChange = (id: string, receivedByOsa: boolean) => {
    updateOsaReceipt.mutate(
      { id, receivedByOsa },
      {
        onSuccess: (updatedItem) => {
          setSelectedReport((current) =>
            current?.id === updatedItem.id
              ? { ...current, receivedByOsa: updatedItem.receivedByOsa ?? false }
              : current,
          );
          toast.success(
            receivedByOsa
              ? "Item marked received by OSA."
              : "Item marked not yet received.",
          );
        },
        onError: () => {
          toast.error("Could not update the OSA receipt status. Please try again.");
        },
      },
    );
  };

  const handleDelete = (id: string, reason?: string) => {
    deleteItem.mutate(
      { id, reason },
      {
        onSuccess: () => {
          toast.success("Item report deleted.");
          setSelectedReport(null);
        },
        onError: (err) => {
          const message = (
            err as { response?: { data?: { message?: string } } }
          )?.response?.data?.message;
          toast.error(message ?? "Could not delete this report. Please try again.");
        },
      },
    );
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      if (statusFilter === "Flagged") {
        if ((report.flagCount ?? 0) === 0) return false;
      } else if (
        statusFilter !== "All statuses" &&
        report.status !== statusFilter
      ) {
        return false;
      }
      if (
        osaReceiptFilter !== "All found items" &&
        (report.type !== "Found" ||
          report.receivedByOsa !== (osaReceiptFilter === "Received by OSA"))
      ) {
        return false;
      }
      if (
        categoryFilter !== "All categories" &&
        !categoryOptions.some(
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

      return report.title.toLowerCase().includes(normalizedQuery);
    });
  }, [
    buildingFilter,
    categoryFilter,
    categoryOptions,
    osaReceiptFilter,
    query,
    reports,
    statusFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const rangeStart =
    filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredRows.length);

  const updateQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const updateOsaReceiptFilter = (value: string) => {
    setOsaReceiptFilter(value);
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
      searchPlaceholder="Search items by name…"
    >
      <Panel
        title="Item reports"
        borderless
        className="flex h-[calc(100dvh-11.5rem)] flex-col overflow-hidden sm:h-[calc(100dvh-8rem)]"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {filteredRows.length} reports
            </span>
            <button
              type="button"
              onClick={() => setFilterOptionsOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
              Filter options
            </button>
            <button
              type="button"
              onClick={() => navigate(paths.adminItemsNew)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Report an item
            </button>
          </div>
        }
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="report-status-filter">
              Filter by status
            </label>
            <select
              id="report-status-filter"
              name="report-status"
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
              className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All statuses</option>
              <option>Lost</option>
              <option>Found</option>
              <option>Returned</option>
              <option>Claimed</option>
              <option>Flagged</option>
            </select>

            <label className="sr-only" htmlFor="report-osa-receipt-filter">
              Filter by OSA receipt
            </label>
            <select
              id="report-osa-receipt-filter"
              name="report-osa-receipt"
              value={osaReceiptFilter}
              onChange={(event) => updateOsaReceiptFilter(event.target.value)}
              className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All found items</option>
              <option>Received by OSA</option>
              <option>Not Yet Received</option>
            </select>

            <label className="sr-only" htmlFor="report-category-filter">
              Filter by category
            </label>
            <select
              id="report-category-filter"
              name="report-category"
              value={categoryFilter}
              onChange={(event) => updateCategoryFilter(event.target.value)}
              className="h-9 max-w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option value="All categories">All categories</option>
              {categoryOptions.map((category) => (
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
              className="h-9 max-w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option value="All buildings">All buildings</option>
              {buildingOptions.map((building) => (
                <option key={building}>{building}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-10">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading reports…
            </p>
          </div>
        ) : isError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-10">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Could not load item reports.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              Retry
            </button>
          </div>
        ) : (
          <ItemTable
            rows={pageRows}
            onViewDetails={setSelectedReport}
            wholeRowClickable
            fitViewport
            onVisibleRowsChange={setPageSize}
          />
        )}

        <div className="flex shrink-0 flex-col gap-3 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filteredRows.length}
            {hasNextPage ? "+" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LoadMoreButton
              hasMore={Boolean(hasNextPage)}
              isLoading={isFetchingNextPage}
              onLoadMore={() => void fetchNextPage()}
              label="Load more items"
              compact
              className="py-0"
            />
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
        </div>
      </Panel>

      {selectedReport && (
        <ItemDetailsDialog
          key={selectedReport.id}
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
          onDelete={handleDelete}
          isDeleting={deleteItem.isPending}
          onOsaReceiptChange={handleOsaReceiptChange}
          isUpdatingOsaReceipt={updateOsaReceipt.isPending}
        />
      )}

      <FilterOptionsModal
        open={filterOptionsOpen}
        onClose={() => setFilterOptionsOpen(false)}
      />
    </AdminLayout>
  );
}

export default ReportsPage;

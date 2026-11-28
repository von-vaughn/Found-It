import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import {
  ReportedItemsSkeleton,
  ReportedItemsView,
} from "@/components/admin/ReportedItemsView";
import {
  useDeleteItem,
  useDismissItemFlags,
  useItems,
} from "@/hooks/useItems";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

export function ReportedItemsPage() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Lost" | "Found">("All");
  const [selectedId, setSelectedId] = useState(itemId ?? "");

  const { data: items = [], isLoading, isError, refetch } = useItems();
  const dismissItemFlags = useDismissItemFlags();
  const deleteItem = useDeleteItem();

  const flaggedReports = useMemo(() => {
    return items
      .map(serverItemToAdminReport)
      .filter((report) => (report.flags?.length ?? report.flagCount ?? 0) > 0)
      .sort((a, b) => {
        const flagDiff =
          (b.flags?.length ?? b.flagCount ?? 0) -
          (a.flags?.length ?? a.flagCount ?? 0);
        if (flagDiff !== 0) return flagDiff;
        const aTime = a.flags?.[0]?.createdAt ?? "";
        const bTime = b.flags?.[0]?.createdAt ?? "";
        return bTime.localeCompare(aTime);
      });
  }, [items]);

  const queryMatched = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return flaggedReports;
    return flaggedReports.filter((report) => {
      const haystack = [
        report.title,
        report.reportedBy,
        report.category,
        ...(report.flags ?? []).flatMap((flag) => [
          flag.reason,
          flag.reporterName,
          flag.reporterEmail,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [flaggedReports, query]);

  const typeCounts = useMemo(
    () => ({
      All: queryMatched.length,
      Lost: queryMatched.filter((report) => report.type === "Lost").length,
      Found: queryMatched.filter((report) => report.type === "Found").length,
    }),
    [queryMatched],
  );

  const visibleReports = useMemo(() => {
    if (typeFilter === "All") return queryMatched;
    return queryMatched.filter((report) => report.type === typeFilter);
  }, [queryMatched, typeFilter]);

  const handleDismissFlags = (id: string) => {
    dismissItemFlags.mutate(id, {
      onSuccess: () => {
        toast.success("Flags dismissed.");
      },
      onError: () => {
        toast.error("Could not dismiss flags. Please try again.");
      },
    });
  };

  const handleDeleteReport = (
    id: string,
    reason: string,
    onSuccess: () => void,
  ) => {
    deleteItem.mutate(
      { id, reason },
      {
        onSuccess: () => {
          toast.success("Reported item deleted.");
          onSuccess();
        },
        onError: (err) => {
          const message = (
            err as { response?: { data?: { message?: string } } }
          )?.response?.data?.message;
          toast.error(
            message ?? "Could not delete this report. Please try again.",
          );
        },
      },
    );
  };

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("All");
  };

  return (
    <AdminLayout
      activeSection="reported"
      showSearch
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="Search flagged posts, reasons, or flaggers"
    >
      {isLoading ? (
        <ReportedItemsSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Could not load reported items
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#E5192D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Retry
          </button>
        </div>
      ) : (
        <ReportedItemsView
          reports={visibleReports}
          allFlaggedCount={flaggedReports.length}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          typeCounts={typeCounts}
          selectedId={selectedId}
          onSelectId={(id) => {
            setSelectedId(id);
            navigate(`${paths.adminReported}/${encodeURIComponent(id)}`, {
              replace: true,
            });
          }}
          onResetFilters={resetFilters}
          onBrowseAllItems={() => navigate(paths.adminItems)}
          onDismissFlags={handleDismissFlags}
          isDismissingFlags={dismissItemFlags.isPending}
          onDeleteReport={handleDeleteReport}
          isDeletingReport={deleteItem.isPending}
        />
      )}
    </AdminLayout>
  );
}

export default ReportedItemsPage;

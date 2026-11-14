import React, { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FilterPaletteBody } from "@/components/FilterPaletteBody";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
} from "@/components/school_user/itemFilters";
import { EMPTY_ITEMS } from "@/data/mockItems";
import { useBrowseFilters } from "./useBrowseFilters";
import { useItems } from "@/hooks/useItems";
import { toClientItems } from "@/lib/itemAdapter";
import { useAuth } from "@/context/useAuth";
import { paths } from "@/routes/paths";

export const BrowseFiltersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "school_user") {
      navigate(paths.dashboard, { replace: true });
    }
  }, [user, navigate]);

  const [searchParams] = useSearchParams();
  const { filters, setFilters, selectedCategory, setSelectedCategory } =
    useBrowseFilters();

  // Fetch real items from the API (works for both guests and authenticated users)
  const { data: serverItems } = useItems(undefined, {
    staleTime: 30_000,
  });
  const items = serverItems ? toClientItems(serverItems) : EMPTY_ITEMS;

  const requestedType = searchParams.get("type");
  const searchQuery = searchParams.get("q") || "";
  const activeTab =
    requestedType === "lost" || requestedType === "found"
      ? requestedType
      : "all";

  const backTo = searchQuery.trim()
    ? `/browse?type=${activeTab}&q=${encodeURIComponent(searchQuery.trim())}`
    : `/browse?type=${activeTab}`;

  // Same pipeline as BrowseItemsPage so the count matches what "Show results" reveals.
  const resultCount = useMemo(
    () =>
      applyAdvancedFilters(
        items.filter((item) => {
          if (activeTab !== "all" && item.type !== activeTab) return false;
          if (
            filters.categories.length === 0 &&
            selectedCategory !== "all" &&
            item.category !== selectedCategory
          ) {
            return false;
          }
          const query = searchQuery.toLowerCase().trim();
          return (
            item.title.toLowerCase().includes(query) ||
            item.location.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
          );
        }),
        filters,
      ).length,
    [items, filters, activeTab, selectedCategory, searchQuery],
  );
  const activeFilterCount = countActiveFilters(filters);

  if (user?.role === "school_user") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <main className="mx-auto w-full max-w-[720px] bg-white px-4 py-6 pb-20 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </button>

        <header className="mt-2 mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Filters
          </h1>
          {activeFilterCount > 0 && (
            <p className="mt-1 text-sm text-neutral-600">
              {activeFilterCount} active · {resultCount} matching{" "}
              {resultCount === 1 ? "item" : "items"}
            </p>
          )}
        </header>

        <div className="pb-8">
          <FilterPaletteBody
            variant="page"
            active
            onClose={() => navigate(backTo)}
            items={items}
            filters={filters}
            onFiltersChange={(nextFilters) => {
              if (nextFilters.categories.length > 0 && selectedCategory !== "all") {
                setSelectedCategory("all");
              }
              setFilters(nextFilters);
            }}
            onClearFilters={() => setFilters(defaultFilters)}
            filterResultCount={resultCount}
          />
        </div>
      </main>
    </div>
  );
};

export default BrowseFiltersPage;

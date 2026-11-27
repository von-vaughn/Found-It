import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search, SearchX, SlidersHorizontal, Loader2 } from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { formatCategoryLabel, useCategories } from "@/hooks/useCategories";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import { EMPTY_ITEMS } from "@/data/mockItems";
import { ItemCard } from "@/components/school_user/ItemCard";
import { FadeIn } from "@/components/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { ItemModal } from "@/components/ItemModal";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
} from "@/components/school_user/itemFilters";
import { useBrowseFilters } from "./useBrowseFilters";
import { useInfiniteItems } from "@/hooks/useItems";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { toClientItems } from "@/lib/itemAdapter";
import { useAuth } from "@/context/useAuth";
import { paths } from "@/routes/paths";

type BrowseTab = "all" | "lost" | "found";

export const BrowseItemsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialBrowseState = location.state as {
    category?: string;
    openFilters?: boolean;
  } | null;

  useEffect(() => {
    if (user?.role === "school_user") {
      navigate(paths.dashboard, { replace: true });
    }
  }, [user, navigate]);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(() =>
    Boolean(initialBrowseState?.openFilters),
  );
  const {
    filters,
    setFilters,
    selectedCategory,
    setSelectedCategory,
  } = useBrowseFilters(
    searchParams.get("category") ?? initialBrowseState?.category,
  );
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const categoryMeasureRef = useRef<HTMLDivElement>(null);
  const moreCategoryMeasureRef = useRef<HTMLButtonElement>(null);
  const searchQuery = searchParams.get("q") || "";
  const requestedType = searchParams.get("type");
  const activeTab: BrowseTab =
    requestedType === "lost" || requestedType === "found"
      ? requestedType
      : "all";

  // Fetch real items from the API (works for both guests and authenticated users)
  const {
    items: serverItems,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteItems(undefined, 24);
  const items = serverItems.length > 0 ? toClientItems(serverItems) : EMPTY_ITEMS;

  const updateParams = (patch: { type?: BrowseTab; q?: string }) => {
    const nextParams = new URLSearchParams(searchParams);
    if (patch.type) nextParams.set("type", patch.type);
    if (patch.q !== undefined) {
      if (patch.q) nextParams.set("q", patch.q);
      else nextParams.delete("q");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchQueryChange = (query: string) => {
    updateParams({ q: query });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(
      query
        ? `/browse?type=${activeTab}&q=${encodeURIComponent(query)}`
        : `/browse?type=${activeTab}`,
    );
  };

  const openFilters = () => {
    // Same as the school_user header: full filters page on mobile, modal on desktop.
    if (window.matchMedia("(max-width: 767px)").matches) {
      const query = searchQuery.trim();
      navigate(
        query
          ? `/browse/filters?type=${activeTab}&q=${encodeURIComponent(query)}`
          : `/browse/filters?type=${activeTab}`,
      );
      return;
    }
    setFilterModalOpen(true);
  };

  const { data: serverCategories } = useCategories();
  const categories = [
    { id: "all", label: "All" },
    ...(serverCategories
      ? serverCategories.map((category) => ({
          id: category.name,
          label: formatCategoryLabel(category.name),
        }))
      : ITEM_CATEGORIES),
  ];
  const visibleCategories = categories.slice(0, visibleCategoryCount);
  const hasHiddenSelectedCategory = filters.categories.some(
    (categoryId) =>
      !visibleCategories.some((category) => category.id === categoryId),
  );
  const selectedVisibleCategory = visibleCategories.find((category) =>
    filters.categories.includes(category.id),
  );
  const isSelectedCategoryVisible = visibleCategories.some(
    (category) => category.id === selectedCategory,
  );
  // Mirrors DashboardPage: a multi-category or hidden single-category
  // advanced-filter selection can't be shown on one pill, so More carries
  // the highlight. A hidden quick-pill selection also falls back to More.
  const activeCategoryId =
    filters.categories.length > 0
      ? filters.categories.length > 1 || hasHiddenSelectedCategory
        ? "more"
        : (selectedVisibleCategory?.id ?? selectedCategory)
      : isSelectedCategoryVisible
        ? selectedCategory
        : "more";

  useLayoutEffect(() => {
    const row = categoryRowRef.current;
    const measureRow = categoryMeasureRef.current;
    const moreButton = moreCategoryMeasureRef.current;
    if (!row || !measureRow || !moreButton) return;

    const updateVisibleCategoryCount = () => {
      const availableWidth = row.clientWidth;
      const categoryButtons = Array.from(measureRow.children).slice(
        0,
        categories.length,
      ) as HTMLElement[];
      const categoryWidths = categoryButtons.map(
        (button) => button.getBoundingClientRect().width,
      );
      const moreWidth = moreButton.getBoundingClientRect().width;
      const gap =
        Number.parseFloat(getComputedStyle(measureRow).columnGap) || 0;
      const allCategoriesWidth =
        categoryWidths.reduce((total, width) => total + width, 0) +
        gap * Math.max(0, categoryWidths.length - 1);

      if (allCategoriesWidth <= availableWidth) {
        setVisibleCategoryCount(categories.length);
        return;
      }

      let usedWidth = 0;
      let count = 0;
      for (const width of categoryWidths) {
        const nextWidth = usedWidth + (count > 0 ? gap : 0) + width;
        const widthWithMore = nextWidth + gap + moreWidth;
        if (widthWithMore > availableWidth) break;
        usedWidth = nextWidth;
        count += 1;
      }
      setVisibleCategoryCount(count);
    };

    updateVisibleCategoryCount();
    const observer = new ResizeObserver(updateVisibleCategoryCount);
    observer.observe(row);
    observer.observe(measureRow);
    return () => observer.disconnect();
  }, [categories.length]);

  const filteredItems = applyAdvancedFilters(
    items.filter((item) => {
      if (activeTab !== "all" && item.type !== activeTab) return false;
      const matchesCategory =
        filters.categories.length > 0 || selectedCategory === "all"
          ? true
          : item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        Boolean(item.customCategory?.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    }),
    filters,
  );

  const activeFilterCount = countActiveFilters(filters);

  const activeTabLabel =
    activeTab === "all" ? "all" : activeTab === "lost" ? "lost" : "found";

  if (user?.role === "school_user") {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f7f7f8] dark:bg-neutral-950 pt-5 pb-10 sm:pt-7 sm:pb-14">
      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-8 w-full">
          <FadeIn>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="min-w-0 flex-1">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <Search
                    className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      handleSearchQueryChange(event.target.value)
                    }
                    placeholder={`Search ${activeTab} items by name…`}
                    aria-label={`Search ${activeTab} items by name`}
                    autoComplete="off"
                    className="h-12 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-10 pr-12 text-sm text-neutral-800 dark:text-neutral-100 shadow-xs placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  />
                  <button
                    type="button"
                    onClick={openFilters}
                    title="Filters"
                    aria-label="Open filters"
                    aria-expanded={filterModalOpen}
                    className={`absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer ${
                      filterModalOpen || activeFilterCount > 0
                        ? "text-neutral-900 dark:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 bg-[#E5192D] px-1 text-[10px] font-bold text-white tabular-nums">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </FadeIn>

          <FadeIn delay={0.05} className="w-full min-w-0">
            <div
              ref={categoryRowRef}
              aria-label="Filter items by category"
              className="relative flex w-full max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            {visibleCategories.map((cat) => {
              const Icon = "icon" in cat ? cat.icon : null;
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === "all") {
                      handleSearchQueryChange("");
                      setSelectedCategory("all");
                      setFilters(defaultFilters);
                      return;
                    }
                    setSelectedCategory(cat.id);
                    if (filters.categories.length > 0) {
                      setFilters({ ...filters, categories: [] });
                    }
                  }}
                  aria-pressed={isActive}
                  className={`grow shrink-0 basis-auto whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                    isActive
                      ? "bg-[#E5192D] text-white"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  <span>{cat.label}</span>
                </button>
              );
            })}
            {visibleCategoryCount < categories.length && (
              <button
                type="button"
                onClick={openFilters}
                aria-label="More category filters"
                aria-pressed={activeCategoryId === "more"}
                className={`ml-auto shrink-0 sticky right-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 inline-flex items-center gap-2 ${
                  activeCategoryId === "more"
                    ? "bg-[#E5192D] text-white"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <span>More</span>
              </button>
            )}
            <div
              ref={categoryMeasureRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 flex w-max flex-nowrap items-center gap-2 invisible"
            >
              {categories.map((cat) => {
                const Icon = "icon" in cat ? cat.icon : null;
                return (
                  <button
                    key={cat.id}
                    tabIndex={-1}
                    className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
              <button
                ref={moreCategoryMeasureRef}
                tabIndex={-1}
                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <span>More</span>
              </button>
            </div>
            </div>
          </FadeIn>
        </div>

        {isLoading ? (
          <div className="flex-1 py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading items…</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <>
          <StaggerGrid
            key={`${activeTab}-${selectedCategory}-${JSON.stringify(filters)}-${filteredItems.length}-${filteredItems[0]?.id ?? ""}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredItems.map((item) => (
              <StaggerItem
                key={item.id}
                className="min-w-0 [&>div]:h-full"
              >
                <ItemCard
                  item={item}
                  showActionLabel={false}
                  onItemClick={(selected) => setSelectedItem(selected)}
                />
              </StaggerItem>
            ))}
          </StaggerGrid>
          <LoadMoreButton
            hasMore={Boolean(hasNextPage)}
            isLoading={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            label="Load more items"
            className="mt-4"
          />
          </>
        ) : (
          <div className="flex-1 py-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 mb-4">
              <SearchX className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              No matching {activeTabLabel} items found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
              Try another search or reset filters.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSearchQueryChange("");
                  setSelectedCategory("all");
                  setFilters(defaultFilters);
                }}
                className="px-4 py-2 bg-[#E5192D] text-white rounded-xl text-xs font-semibold hover:bg-[#c81424] transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
              {hasNextPage && (
                <LoadMoreButton
                  hasMore={Boolean(hasNextPage)}
                  isLoading={isFetchingNextPage}
                  onLoadMore={() => void fetchNextPage()}
                  label="Load more items"
                  compact
                  className="py-0"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <SearchPaletteModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        initialQuery={searchQuery}
        onSubmitSearch={(query) => handleSearchQueryChange(query)}
        items={items}
        filters={filters}
        onFiltersChange={(nextFilters) => {
          if (nextFilters.categories.length > 0 && selectedCategory !== "all") {
            setSelectedCategory("all");
          }
          setFilters(nextFilters);
        }}
        onClearFilters={() => setFilters(defaultFilters)}
        filterResultCount={filteredItems.length}
      />
    </div>
  );
};

export default BrowseItemsPage;

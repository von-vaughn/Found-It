import React, { useLayoutEffect, useRef, useState } from "react";
import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import { ItemCard } from "@/components/school_user/ItemCard";
import { ItemModal } from "@/components/ItemModal";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
} from "@/components/school_user/itemFilters";
import { useBrowseFilters } from "./useBrowseFilters";

interface BrowseItemsPageProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
}

type BrowseTab = "all" | "lost" | "found";

export const BrowseItemsPage: React.FC<BrowseItemsPageProps> = ({
  items,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const {
    filters,
    setFilters,
    selectedCategory,
    setSelectedCategory,
  } = useBrowseFilters();
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const categoryMeasureRef = useRef<HTMLDivElement>(null);
  const moreCategoryMeasureRef = useRef<HTMLButtonElement>(null);
  const searchQuery = searchParams.get("q") || "";
  const requestedType = searchParams.get("type");
  const activeTab: BrowseTab =
    requestedType === "all" || requestedType === "found"
      ? requestedType
      : "lost";

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

  const categories = [
    { id: "all", label: "All" },
    ...ITEM_CATEGORIES,
  ];
  const visibleCategories = categories.slice(0, visibleCategoryCount);
  // A multi-category filter selection can't be shown on one pill,
  // so the More button carries the highlight instead.
  const hasMultipleCategoryFilters = filters.categories.length > 1;
  const activeCategoryId =
    hasMultipleCategoryFilters ||
    !visibleCategories.some((category) => category.id === selectedCategory)
      ? "more"
      : selectedCategory;

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
        selectedCategory === "all"
          ? true
          : item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    }),
    filters,
  );

  const activeFilterCount = countActiveFilters(filters);

  const activeTabLabel =
    activeTab === "all" ? "all" : activeTab === "lost" ? "lost" : "found";

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-8 w-full">
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
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-12 text-sm text-neutral-800 shadow-xs placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                />
                <button
                  type="button"
                  onClick={openFilters}
                  title="Filters"
                  aria-label="Open filters"
                  aria-expanded={filterModalOpen}
                  className={`absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer ${
                    filterModalOpen || activeFilterCount > 0
                      ? "text-neutral-900 hover:bg-neutral-200/70"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E5192D] px-1 text-[10px] font-bold text-white tabular-nums">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div
            ref={categoryRowRef}
            aria-label="Filter items by category"
            className="relative flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden pb-1"
          >
            {visibleCategories.map((cat) => {
              const Icon = "icon" in cat ? cat.icon : null;
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    // "All" clears every filter, not just the category row.
                    if (cat.id === "all") setFilters(defaultFilters);
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20"
                      : "bg-white text-neutral-600 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  <span>{cat.label}</span>
                </button>
              );
            })}
            {visibleCategoryCount < categories.length && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={openFilters}
                  aria-label="More category filters"
                  aria-pressed={activeCategoryId === "more"}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 inline-flex items-center gap-2 ${
                    activeCategoryId === "more"
                      ? "bg-[#E5192D] text-white border-[#E5192D]"
                      : "border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <span>More</span>
                </button>
              </div>
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
                    className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2"
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
              <button
                ref={moreCategoryMeasureRef}
                tabIndex={-1}
                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-2"
              >
                <span>More</span>
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onItemClick={(selected) => setSelectedItem(selected)}
              />
            ))}
          </div>
        ) : (
          <div className="min-h-[60dvh] text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
              <SearchX className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              No matching {activeTabLabel} items found
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mb-4">
              We couldn&apos;t find any {activeTabLabel} items matching
              &ldquo;{searchQuery}&rdquo;. Try searching for another term or
              change your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                handleSearchQueryChange("");
                setSelectedCategory("all");
                setFilters(defaultFilters);
              }}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              Reset Filters
            </button>
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
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters(defaultFilters)}
        filterResultCount={filteredItems.length}
      />
    </div>
  );
};

export default BrowseItemsPage;

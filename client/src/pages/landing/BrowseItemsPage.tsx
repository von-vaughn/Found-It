import React, { useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import { ItemCard } from "@/components/school_user/ItemCard";
import { ItemModal } from "@/components/ItemModal";
import { ReportModal } from "@/components/ReportModal";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

interface BrowseItemsPageProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
}

type BrowseTab = "lost" | "found";

export const BrowseItemsPage: React.FC<BrowseItemsPageProps> = ({
  items,
  onAddItem,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const categoryMeasureRef = useRef<HTMLDivElement>(null);
  const moreCategoryMeasureRef = useRef<HTMLButtonElement>(null);
  const searchQuery = searchParams.get("q") || "";
  const activeTab: BrowseTab =
    searchParams.get("type") === "found" ? "found" : "lost";
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

  const categories = [
    { id: "all", label: "All Items" },
    ...ITEM_CATEGORIES,
  ];
  const visibleCategories = categories.slice(0, visibleCategoryCount);
  const activeCategoryId = visibleCategories.some(
    (category) => category.id === selectedCategory,
  )
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
      if (item.type !== activeTab) return false;
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

  const isLost = activeTab === "lost";

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-8 w-full">
          <form onSubmit={handleSearchSubmit} className="w-full">
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
                className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-800 shadow-xs placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              />
            </div>
          </form>

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
                  onClick={() => setSelectedCategory(cat.id)}
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
                  onClick={() => setFilterModalOpen(true)}
                  aria-label="More category filters"
                  aria-pressed={activeCategoryId === "more"}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 inline-flex items-center gap-2 ${
                    activeCategoryId === "more" || activeFilterCount > 0
                      ? "bg-[#E5192D] text-white border-[#E5192D]"
                      : "border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <span>More</span>
                  {activeFilterCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold text-white"
                    >
                      {activeFilterCount}
                    </span>
                  )}
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
        ) : isLost ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-neutral-200 mt-6 shadow-xs">
            <div className="w-14 h-14 bg-red-100/60 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E5192D]">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              No lost items match your search
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              We couldn&apos;t find any lost items matching &ldquo;
              {searchQuery}
              &rdquo;. Try clearing your filters or report a new lost item.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => setIsReportModalOpen(true)}
                className="rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold text-xs px-5 shadow-sm"
              >
                Report Lost Item
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleSearchQueryChange("");
                  setSelectedCategory("all");
                  setFilters(defaultFilters);
                }}
                className="rounded-full text-xs"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-16">
            No found items match your search.
          </p>
        )}
      </div>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <ReportModal
        key={activeTab}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType={activeTab}
        onAddItem={onAddItem}
      />

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

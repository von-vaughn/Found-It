import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useLayoutEffect,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/school_user/Sidebar";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import { SearchX } from "lucide-react";
import { ITEM_CATEGORIES, type ItemCategory } from "@/data/itemCategories";
import { initialItems, type Item } from "@/data/mockItems";
import type { ClaimRequest } from "@/types/claim";

interface DashboardPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem: propOnAddItem,
}) => {
  const [internalItems, setInternalItems] = useState<Item[]>(initialItems);
  const items = propItems ?? internalItems;

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<string>("home");
  const [filterType, setFilterType] = useState<"all" | "lost" | "found">("all");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | ItemCategory
  >("all");
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(0);
  const typeTabsRef = useRef<HTMLElement>(null);
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const categoryMeasureRef = useRef<HTMLDivElement>(null);
  const moreCategoryMeasureRef = useRef<HTMLButtonElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [showHeaderTypeTabs, setShowHeaderTypeTabs] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<
    "lost" | "found"
  >("lost");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const tabs = typeTabsRef.current;
    if (!tabs) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeaderTypeTabs(
          !entry.isIntersecting && entry.boundingClientRect.bottom <= 80,
        );
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

  // Keep the URL query in sync so feed search is deep-linkable
  // (e.g. searching from the item detail page lands here filtered).
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (current === searchQuery) return;
    setSearchParams(searchQuery ? { q: searchQuery } : {}, { replace: true });
  }, [searchQuery, searchParams, setSearchParams]);

  const handleAddItem = (newItem: Item) => {
    if (propOnAddItem) {
      propOnAddItem(newItem);
    }
    setInternalItems((prev) => [newItem, ...prev]);
  };

  const handleOpenCreateModal = (type: "lost" | "found" = "lost") => {
    setCreateModalInitialType(type);
    setCreateModalOpen(true);
  };

  const categories = [
    { id: "all", label: "All Items" },
    ...ITEM_CATEGORIES.filter((category) => category.id !== "eyewear"),
  ] as const;
  const visibleCategories = categories.slice(0, visibleCategoryCount);
  const hasHiddenSelectedCategory = filters.categories.some(
    (categoryId) =>
      !visibleCategories.some((category) => category.id === categoryId),
  );
  const selectedVisibleCategory = visibleCategories.find((category) =>
    filters.categories.includes(category.id),
  );
  const activeCategoryId =
    filters.categories.length > 0
      ? filters.categories.length > 1 || hasHiddenSelectedCategory
        ? "more"
        : (selectedVisibleCategory?.id ?? selectedCategory)
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
      const gap = Number.parseFloat(getComputedStyle(measureRow).columnGap) || 0;
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

  // Filter items: search matches item name only; type and category
  // come from the quick pills; location/color/date-time from the palette.
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const preFiltered = items.filter((item) => {
      // Type filter (All vs Lost vs Found)
      if (filterType !== "all" && item.type !== filterType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Item-name search (title only)
      if (query && !item.title.toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
    return applyAdvancedFilters(preFiltered, filters);
  }, [items, filterType, searchQuery, selectedCategory, filters]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="min-h-screen bg-white flex selection:bg-[#E5192D] selection:text-white font-open-sans text-neutral-900">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeNavTab}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === "discover") {
            setFilterType("all");
          }
        }}
        onOpenCreateModal={() => handleOpenCreateModal("lost")}
      />

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 ml-16 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarExpanded ? "md:ml-60" : "md:ml-20"}`}>
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          activeFilterCount={activeFilterCount}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(defaultFilters)}
          filterResultCount={filteredItems.length}
          notificationsOpen={notificationsOpen}
          isFilterModalOpen={filterModalOpen}
          onFilterModalOpenChange={setFilterModalOpen}
          dashboardTypeTabsVisible={showHeaderTypeTabs}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
        />

        {/* Dashboard Main Container */}
        <main className="flex-1 min-w-0 w-full max-w-[1600px] mx-auto bg-white px-2 sm:px-3 lg:px-4 py-5 space-y-5">
          <div className={`@container min-w-0 space-y-5 transition-[margin,width] duration-300 ease-in-out ${
            notificationsOpen
              ? "md:ml-80 md:w-[calc(100%-20rem)]"
              : "w-full"
          }`}>
          {/* Filter Pills and Tabs Bar */}
          <div className="flex items-center gap-3 pt-1">
            {/* "All" Tab with bottom underline */}
            <nav
              ref={typeTabsRef}
              aria-label="Filter items by type"
              className="flex items-center gap-4"
            >
            <button
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer ${
                filterType === "all"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              All
              {filterType === "all" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>

            {/* "Lost Item" Tab */}
            <button
              onClick={() =>
                setFilterType(filterType === "lost" ? "all" : "lost")
              }
              aria-pressed={filterType === "lost"}
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer ${
                filterType === "lost"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              Lost Item
              {filterType === "lost" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>

            {/* "Found Item" Tab */}
            <button
              onClick={() =>
                setFilterType(filterType === "found" ? "all" : "found")
              }
              aria-pressed={filterType === "found"}
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer ${
                filterType === "found"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              Found Item
              {filterType === "found" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>
            </nav>

            {/* Result count indicator if filtered or searched */}
            {(searchQuery.trim() || filterType !== "all" || selectedCategory !== "all" || activeFilterCount > 0) && (
              <div className="ml-auto text-xs text-neutral-400 font-medium">
                {(searchQuery || filterType !== "all" || selectedCategory !== "all" || activeFilterCount > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setSelectedCategory("all");
                      setFilters(defaultFilters);
                    }}
                    className="ml-2 text-[#E5192D] hover:underline font-bold"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

          <div
            ref={categoryRowRef}
            aria-label="Filter items by category"
            className="relative flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden pb-1"
          >
            {visibleCategories.map((category) => {
              const Icon = "icon" in category ? category.icon : null;
              const isActive = activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    if (category.id === "all") {
                      setSearchQuery("");
                      setFilterType("all");
                      setSelectedCategory("all");
                      setFilters(defaultFilters);
                      return;
                    }
                    setSelectedCategory(category.id);
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20"
                      : "bg-white text-neutral-600 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  <span>{category.label}</span>
                </button>
              );
            })}
            {visibleCategoryCount < categories.length && (
              <button
                type="button"
                onClick={() => setFilterModalOpen(true)}
                aria-label="More category filters"
                aria-pressed={activeCategoryId === "more"}
                className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 inline-flex items-center gap-2 ${
                  activeCategoryId === "more"
                    ? "bg-[#E5192D] text-white border-[#E5192D]"
                    : "border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
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
              {categories.map((category) => {
                const Icon = "icon" in category ? category.icon : null;
                return (
                  <button
                    key={category.id}
                    tabIndex={-1}
                    className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2"
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                    <span>{category.label}</span>
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

          {/* Masonry Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 @7xl:grid-cols-5 gap-6 pb-12">
              {filteredItems.map((item) => (
                <div key={item.id} className="w-full">
                  <ItemCard
                    item={item}
                    onItemClick={(selected) =>
                      navigate(`/dashboard/items/${selected.id}`)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                <SearchX className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1">
                No matching items found
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mb-4">
                We couldn&apos;t find any items matching &ldquo;{searchQuery}
                &rdquo;. Try searching for another term or change your filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
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
        </main>
      </div>

      {/* Create / Report Item Modal */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
        initialType={createModalInitialType}
      />
    </div>
  );
};

export default DashboardPage;

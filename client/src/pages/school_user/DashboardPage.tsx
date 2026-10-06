import React, { useState, useRef, useEffect, useMemo } from "react";
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
import {
  BriefcaseBusiness,
  Glasses,
  KeyRound,
  SearchX,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { initialItems, type Item } from "@/data/mockItems";

interface DashboardPageProps {
  items?: Item[];
  onAddItem?: (newItem: Item) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  items: propItems,
  onAddItem: propOnAddItem,
}) => {
  const [internalItems, setInternalItems] = useState<Item[]>(initialItems);
  const items = propItems ?? internalItems;

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<string>("home");
  const [filterType, setFilterType] = useState<"all" | "lost" | "found">("all");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "bags" | "electronics" | "keys" | "wallets" | "accessories"
  >("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
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
    { id: "bags", label: "Bags", icon: BriefcaseBusiness },
    { id: "electronics", label: "Electronics", icon: Smartphone },
    { id: "keys", label: "Keys", icon: KeyRound },
    { id: "wallets", label: "Wallets", icon: WalletCards },
    { id: "accessories", label: "Accessories", icon: Glasses },
  ] as const;

  // Filter items: search matches item name only; type and category
  // come from the quick pills; location/color/date from Filters.
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
    <div className="min-h-screen bg-[#FBFBFC] flex selection:bg-[#E5192D] selection:text-white font-sans text-neutral-900">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeNavTab}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        onTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === "discover") {
            setFilterType("all");
          }
        }}
        onOpenCreateModal={() => handleOpenCreateModal("lost")}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 ml-16 md:ml-20 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenReportModal={() => handleOpenCreateModal("lost")}
          searchInputRef={searchInputRef}
          sidebarExpanded={sidebarExpanded}
          notificationPanelOpen={notificationsOpen}
          onCategorySelect={(catId) => {
            if (["bags", "electronics", "keys", "wallets", "accessories"].includes(catId)) {
              setSelectedCategory(catId as "bags" | "electronics" | "keys" | "wallets" | "accessories");
            } else {
              setSearchQuery(catId);
            }
          }}
          activeFilterCount={activeFilterCount}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(defaultFilters)}
          filterResultCount={filteredItems.length}
        />

        {/* Dashboard Main Container */}
        <main className="flex-1 min-w-0 w-full max-w-[1400px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-5 space-y-5">
          <div
            className={`@container min-w-0 space-y-5 transition-[margin,width] duration-300 ease-in-out ${
              notificationsOpen
                ? "md:ml-80 md:w-[calc(100%-20rem)]"
                : "w-full"
            }`}
          >
          {/* Filter Pills and Tabs Bar */}
          <div className="flex items-center gap-3 pt-1">
            {/* "All" Tab with bottom underline */}
            <button
              onClick={() => setFilterType("all")}
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${
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
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${
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
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((category) => {
              const Icon = "icon" in category ? category.icon : null;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20"
                      : "bg-white text-neutral-600 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          {/* Masonry Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 gap-6 pb-12">
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

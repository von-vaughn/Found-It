import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Layers,
  Building2,
  BriefcaseBusiness,
  Smartphone,
  KeyRound,
  WalletCards,
  Glasses,
  Package,
  Shirt,
  BookOpen,
  CreditCard,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/data/mockItems";
import {
  countActiveFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

export interface SearchPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectCategory?: (categoryId: string, categoryLabel: string) => void;
  onSelectBuilding?: (buildingName: string) => void;
  onSubmitSearch?: (query: string) => void;
  items?: Item[];
  filters?: ItemFilters;
  onFiltersChange?: (filters: ItemFilters) => void;
  onClearFilters?: () => void;
  filterResultCount?: number;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  baseCount: number;
}

interface BuildingOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  baseCount: number;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "electronics", name: "Electronics", icon: Smartphone, baseCount: 191 },
  { id: "bags", name: "Bags", icon: BriefcaseBusiness, baseCount: 52 },
  { id: "wallets", name: "Wallets", icon: WalletCards, baseCount: 38 },
  { id: "keys", name: "Keys", icon: KeyRound, baseCount: 25 },
  { id: "accessories", name: "Accessories", icon: Glasses, baseCount: 30 },
  { id: "clothing", name: "Clothing & Apparel", icon: Shirt, baseCount: 21 },
  { id: "books", name: "Books & Supplies", icon: BookOpen, baseCount: 18 },
  { id: "ids", name: "IDs & Cards", icon: CreditCard, baseCount: 16 },
  { id: "other", name: "Other Items", icon: Package, baseCount: 6 },
];

const BUILDING_OPTIONS: BuildingOption[] = [
  { id: "library", name: "Library Building", icon: Building2, baseCount: 142 },
  { id: "student-center", name: "Student Center", icon: Building2, baseCount: 88 },
  { id: "science-hall", name: "Science Hall", icon: Building2, baseCount: 64 },
  { id: "gymnasium", name: "Gymnasium", icon: Building2, baseCount: 45 },
  { id: "cafeteria", name: "Cafeteria", icon: Building2, baseCount: 39 },
  { id: "admin-building", name: "Admin Building", icon: Building2, baseCount: 31 },
  { id: "engineering", name: "Engineering Building", icon: Building2, baseCount: 27 },
  { id: "auditorium", name: "Auditorium", icon: Building2, baseCount: 22 },
  { id: "main-gate", name: "Main Gate", icon: Building2, baseCount: 19 },
  { id: "parking-lot", name: "Parking Lot", icon: Building2, baseCount: 15 },
  { id: "nursing", name: "College of Nursing", icon: Building2, baseCount: 12 },
  { id: "education", name: "College of Education", icon: Building2, baseCount: 9 },
];

export const SearchPaletteModal: React.FC<SearchPaletteModalProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  onSelectCategory,
  onSelectBuilding,
  onSubmitSearch,
  items,
  filters,
  onFiltersChange,
  onClearFilters,
  filterResultCount,
}) => {
  const [activeTab, setActiveTab] = useState<
    "categories" | "building" | "filters"
  >("categories");
  const [query, setQuery] = useState(initialQuery);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Compute item counts dynamically if real items exist
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    CATEGORY_OPTIONS.forEach((cat) => {
      const liveCount = items?.filter(
        (i) => i.category.toLowerCase() === cat.id.toLowerCase(),
      ).length;
      map.set(cat.id, liveCount !== undefined && liveCount > 0 ? liveCount : cat.baseCount);
    });
    return map;
  }, [items]);

  const buildingCounts = useMemo(() => {
    const map = new Map<string, number>();
    BUILDING_OPTIONS.forEach((bld) => {
      const liveCount = items?.filter(
        (i) =>
          i.location.toLowerCase().includes(bld.name.toLowerCase()) ||
          bld.name.toLowerCase().includes(i.location.toLowerCase()),
      ).length;
      map.set(bld.id, liveCount !== undefined && liveCount > 0 ? liveCount : bld.baseCount);
    });
    return map;
  }, [items]);

  const showFiltersTab = !!filters && !!onFiltersChange;
  const filterCount = filters ? countActiveFilters(filters) : 0;
  const tabOrder: Array<"categories" | "building" | "filters"> =
    showFiltersTab
      ? ["categories", "building", "filters"]
      : ["categories", "building"];

  // Filter lists based on query
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_OPTIONS;
    return CATEGORY_OPTIONS.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const filteredBuildings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BUILDING_OPTIONS;
    return BUILDING_OPTIONS.filter((b) => b.name.toLowerCase().includes(q));
  }, [query]);

  const currentItems =
    activeTab === "filters"
      ? []
      : activeTab === "categories"
        ? filteredCategories
        : filteredBuildings;

  // Reset highlight index when filtering or changing tabs
  useEffect(() => {
    setHighlightedIndex(0);
  }, [activeTab, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleSelectCategory = (cat: CategoryOption) => {
    onSelectCategory?.(cat.id, cat.name);
    onClose();
  };

  const handleSelectBuilding = (bld: BuildingOption) => {
    onSelectBuilding?.(bld.name);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < currentItems.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, currentItems.length - 1),
      );
    } else if (e.key === "Tab") {
      e.preventDefault();
      setActiveTab((prev) => {
        const idx = tabOrder.indexOf(prev);
        return tabOrder[(idx + 1) % tabOrder.length];
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeTab === "filters") return;
      if (currentItems.length > 0 && currentItems[highlightedIndex]) {
        const item = currentItems[highlightedIndex];
        if (activeTab === "categories") {
          handleSelectCategory(item as CategoryOption);
        } else {
          handleSelectBuilding(item as BuildingOption);
        }
      } else if (query.trim()) {
        onSubmitSearch?.(query.trim());
        onClose();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container (White Theme) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Browse categories, buildings, and filters"
            className="relative w-full max-w-2xl bg-white border border-neutral-200/90 rounded-3xl shadow-2xl shadow-neutral-950/15 flex flex-col overflow-hidden text-neutral-900 z-10 h-[490px] max-h-[85vh]"
          >
            {/* Top Search Bar */}
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-neutral-150 bg-white shrink-0">
              <Search className="w-5 h-5 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search categories or buildings..."
                className="flex-1 bg-transparent text-neutral-900 placeholder-neutral-400 text-base sm:text-lg focus:outline-none font-normal"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Close / ESC key indicator */}
              <kbd
                onClick={onClose}
                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-200 hover:text-neutral-800 transition-colors"
                title="Press ESC to close"
              >
                ESC
              </kbd>
            </div>

            {/* Main Content Area (2 columns: Sidebar & List) */}
            <div className="flex flex-1 min-h-0 divide-x divide-neutral-150">
              {/* Left Sidebar: ONLY Categories and Building */}
              <div className="w-44 sm:w-48 shrink-0 p-3 sm:p-4 flex flex-col gap-1.5 bg-neutral-50/80 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                    activeTab === "categories"
                      ? "bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
                  }`}
                >
                  <Layers className={`w-4 h-4 shrink-0 ${activeTab === "categories" ? "text-neutral-900" : "text-neutral-400"}`} />
                  <span>Categories</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("building")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                    activeTab === "building"
                      ? "bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${activeTab === "building" ? "text-neutral-900" : "text-neutral-400"}`} />
                  <span>Building</span>
                </button>

                {showFiltersTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("filters")}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                      activeTab === "filters"
                        ? "bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
                    }`}
                  >
                    <SlidersHorizontal className={`w-4 h-4 shrink-0 ${activeTab === "filters" ? "text-neutral-900" : "text-neutral-400"}`} />
                    <span>Filters</span>
                    {filterCount > 0 && (
                      <span className="ml-auto min-w-5 h-5 px-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                        {filterCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Right Panel: Content items with counts */}
              <div
                ref={listRef}
                className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col bg-white scrollbar-thin scrollbar-thumb-neutral-200"
              >
                {activeTab === "filters" && filters && onFiltersChange ? (
                  <>
                    <div className="px-3 py-1 mb-1">
                      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Advanced filters
                      </h3>
                    </div>
                    <div className="px-3 py-2 space-y-3">
                      <div className="min-w-0">
                        <label
                          htmlFor="palette-filter-location"
                          className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5"
                        >
                          Location
                        </label>
                        <input
                          id="palette-filter-location"
                          name="filterLocation"
                          type="text"
                          value={filters.location}
                          onChange={(e) =>
                            onFiltersChange({
                              ...filters,
                              location: e.target.value,
                            })
                          }
                          placeholder="Library…"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 transition-colors"
                        />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor="palette-filter-color"
                          className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5"
                        >
                          Color
                        </label>
                        <div className="relative">
                          <input
                            id="palette-filter-color"
                            name="filterColor"
                            type="text"
                            value={filters.color}
                            onChange={(e) =>
                              onFiltersChange({
                                ...filters,
                                color: e.target.value,
                              })
                            }
                            placeholder="Black…"
                            autoComplete="off"
                            spellCheck={false}
                            className="w-full h-10 pl-3 pr-9 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 transition-colors"
                          />
                          <span
                            aria-hidden="true"
                            style={{
                              backgroundColor:
                                filters.color.trim() || "transparent",
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-neutral-200"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0">
                          <label
                            htmlFor="palette-filter-date-from"
                            className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5"
                          >
                            From
                          </label>
                          <input
                            id="palette-filter-date-from"
                            name="filterDateFrom"
                            type="date"
                            value={filters.dateFrom}
                            max={filters.dateTo || undefined}
                            onChange={(e) =>
                              onFiltersChange({
                                ...filters,
                                dateFrom: e.target.value,
                              })
                            }
                            className="w-full h-10 px-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 transition-colors cursor-pointer"
                          />
                        </div>
                        <div className="min-w-0">
                          <label
                            htmlFor="palette-filter-date-to"
                            className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5"
                          >
                            To
                          </label>
                          <input
                            id="palette-filter-date-to"
                            name="filterDateTo"
                            type="date"
                            value={filters.dateTo}
                            min={filters.dateFrom || undefined}
                            onChange={(e) =>
                              onFiltersChange({
                                ...filters,
                                dateTo: e.target.value,
                              })
                            }
                            className="w-full h-10 px-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 transition-colors cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto px-3 pt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onClearFilters?.()}
                        disabled={filterCount === 0}
                        className="text-xs font-bold text-neutral-400 transition-colors hover:text-[#E5192D] cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:text-neutral-400"
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        Show{" "}
                        {filterResultCount !== undefined ? (
                          <span className="tabular-nums">
                            {filterResultCount}
                          </span>
                        ) : null}{" "}
                        results
                      </button>
                    </div>
                  </>
                ) : (
                <>
                <div className="px-3 py-1 mb-1">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {activeTab === "categories" ? "Categories" : "Building"}
                  </h3>
                </div>

                <div className="space-y-1">
                  {currentItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isHighlighted = idx === highlightedIndex;
                    const count =
                      activeTab === "categories"
                        ? categoryCounts.get(item.id) ?? item.baseCount
                        : buildingCounts.get(item.id) ?? item.baseCount;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={idx}
                        onClick={() => {
                          if (activeTab === "categories") {
                            handleSelectCategory(item as CategoryOption);
                          } else {
                            handleSelectBuilding(item as BuildingOption);
                          }
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                          isHighlighted
                            ? "bg-neutral-100 text-neutral-900 font-medium"
                            : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isHighlighted ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-700"}`} />
                          <span className="text-sm truncate">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-xs font-mono text-neutral-400 group-hover:text-neutral-600 shrink-0 ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {currentItems.length === 0 && (
                    <div className="py-8 text-center text-neutral-400 text-sm">
                      <p>No {activeTab === "categories" ? "categories" : "buildings"} found matching "{query}"</p>
                      {query.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            onSubmitSearch?.(query.trim());
                            onClose();
                          }}
                          className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium cursor-pointer transition-colors"
                        >
                          <span>Search all items for "{query}"</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                </>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Layers,
  Building2,
  ArrowRight,
  ChevronDown,
  PackageCheck,
  PackageSearch,
  Tags,
} from "lucide-react";
import { ITEM_CATEGORIES, type ItemCategory } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import type { Item } from "@/data/mockItems";
import {
  countActiveFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

export interface FilterPaletteBodyProps {
  active: boolean;
  variant: "modal" | "page";
  onClose: () => void;
  initialQuery?: string;
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

const CATEGORY_BASE_COUNTS: Record<ItemCategory, number> = {
  electronics: 191,
  id: 16,
  cards: 0,
  bags: 52,
  "wallets-purses": 38,
  keys: 25,
  "clothing-accessories": 21,
  "books-school-supplies": 18,
  jewelry: 0,
  eyewear: 0,
  tumblers: 0,
  umbrellas: 0,
  "sports-gym-equipment": 0,
  "documents-papers": 0,
  other: 6,
};

const CATEGORY_OPTIONS: CategoryOption[] = ITEM_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.label,
  icon: category.icon,
  baseCount: CATEGORY_BASE_COUNTS[category.id],
}));

const BUILDING_OPTIONS: BuildingOption[] = ITEM_BUILDINGS.map((name) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
  icon: Building2,
  baseCount: 0,
}));

interface TypeOption {
  id: "lost" | "found";
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  baseCount: number;
}

const TYPE_OPTIONS: TypeOption[] = [
  { id: "lost", name: "Lost", icon: PackageSearch, baseCount: 0 },
  { id: "found", name: "Found", icon: PackageCheck, baseCount: 0 },
];

type PaletteTab = "categories" | "building" | "type";

function FilterOptionRow({
  checkboxId,
  icon: Icon,
  name,
  count,
  checked,
  disabled,
  highlighted,
  index,
  onToggle,
  onHighlight,
}: {
  checkboxId: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  count: number;
  checked: boolean;
  disabled: boolean;
  highlighted: boolean;
  index?: number;
  onToggle: () => void;
  onHighlight?: () => void;
}) {
  return (
    <label
      htmlFor={checkboxId}
      data-index={index}
      onMouseEnter={onHighlight}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer group ${
        highlighted
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        />
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            highlighted
              ? "text-neutral-900"
              : "text-neutral-400 group-hover:text-neutral-700"
          }`}
        />
        <span className="text-sm truncate">{name}</span>
      </span>

      <span className="text-xs font-mono text-neutral-400 group-hover:text-neutral-600 shrink-0 ml-2">
        {count}
      </span>
    </label>
  );
}

function ColorDateFields({
  filters,
  onFiltersChange,
}: {
  filters?: ItemFilters;
  onFiltersChange?: (filters: ItemFilters) => void;
}) {
  if (!filters || !onFiltersChange) return null;
  return (
    <>
      <div className="min-w-0">
        <label
          htmlFor="palette-filter-datetime-from"
          className="block text-xs font-semibold text-neutral-700 mb-1.5"
        >
          Date
        </label>
        <input
          id="palette-filter-datetime-from"
          name="filterDate"
          type="date"
          value={filters.dateTimeFrom.slice(0, 10)}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateTimeFrom: e.target.value,
            })
          }
          className="w-full h-9 px-2 text-[11px] bg-white rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-300"
        />
      </div>
    </>
  );
}

function MobileFilterDropdown({
  title,
  icon: Icon,
  selectedCount,
  open,
  onToggleOpen,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  selectedCount: number;
  open: boolean;
  onToggleOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
      >
        <Icon className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
        <span className="flex-1 text-sm font-bold text-neutral-900">
          {title}
        </span>
        {selectedCount > 0 && (
          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
            {selectedCount}
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul className="max-h-72 space-y-1 overflow-y-auto px-2 pb-3">
          {children}
        </ul>
      )}
    </div>
  );
}

export const FilterPaletteBody: React.FC<FilterPaletteBodyProps> = ({
  active,
  variant,
  onClose,
  initialQuery = "",
  onSubmitSearch,
  items,
  filters,
  onFiltersChange,
  onClearFilters,
  filterResultCount,
}) => {
  const [activeTab, setActiveTab] = useState<PaletteTab>("categories");
  const [query, setQuery] = useState(initialQuery);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openSection, setOpenSection] = useState<PaletteTab | null>(
    "categories",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync query when (re)activated — derived state applied during render.
  const [prevActiveSync, setPrevActiveSync] = useState({
    active: false,
    initialQuery: "",
  });
  if (
    active !== prevActiveSync.active ||
    initialQuery !== prevActiveSync.initialQuery
  ) {
    setPrevActiveSync({ active, initialQuery });
    if (active) {
      setQuery(initialQuery);
      setHighlightedIndex(0);
    }
  }

  // Focus the input when opened as a modal (external DOM sync only).
  // The full page never steals focus (and its keyboard) on mount.
  useEffect(() => {
    if (!active || variant !== "modal") return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, [active, variant]);

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
        (item) => {
          const normalizedBuilding = bld.name.toLowerCase();
          return (
            item.location.toLowerCase().includes(normalizedBuilding) ||
            normalizedBuilding.includes(item.location.toLowerCase()) ||
            item.building?.toLowerCase().includes(normalizedBuilding)
          );
        },
      ).length;
      map.set(bld.id, liveCount !== undefined && liveCount > 0 ? liveCount : bld.baseCount);
    });
    return map;
  }, [items]);

  const filterCount = filters ? countActiveFilters(filters) : 0;
  const tabOrder: Array<PaletteTab> = ["type", "categories", "building"];

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

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TYPE_OPTIONS;
    return TYPE_OPTIONS.filter((t) => t.name.toLowerCase().includes(q));
  }, [query]);

  const typeCounts = useMemo(() => {
    const lost = items?.filter((i) => i.type === "lost").length ?? 0;
    const found = items?.filter((i) => i.type === "found").length ?? 0;
    return new Map<string, number>([
      ["lost", lost],
      ["found", found],
    ]);
  }, [items]);

  const currentItems =
    activeTab === "categories"
      ? filteredCategories
      : activeTab === "building"
        ? filteredBuildings
        : filteredTypes;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setHighlightedIndex(0);
  };

  const handleTabChange = (tab: PaletteTab) => {
    setActiveTab(tab);
    setHighlightedIndex(0);
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const toggleCategory = (categoryId: string) => {
    if (!filters || !onFiltersChange) return;
    const categories = filters.categories.includes(categoryId)
      ? filters.categories.filter((category) => category !== categoryId)
      : [...filters.categories, categoryId];
    onFiltersChange({ ...filters, categories });
  };

  const toggleBuilding = (buildingName: string) => {
    if (!filters || !onFiltersChange) return;
    const buildings = filters.buildings.includes(buildingName)
      ? filters.buildings.filter((building) => building !== buildingName)
      : [...filters.buildings, buildingName];
    onFiltersChange({ ...filters, buildings });
  };

  const toggleType = (type: string) => {
    if (!filters || !onFiltersChange) return;
    if (type !== "lost" && type !== "found") return;
    const types: ("lost" | "found")[] = filters.types.includes(type)
      ? filters.types.filter((entry) => entry !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types });
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
      setHighlightedIndex(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentItems.length > 0 && currentItems[highlightedIndex]) {
        const item = currentItems[highlightedIndex];
        if (activeTab === "type") {
          toggleType(item.id);
        } else if (activeTab === "categories") {
          toggleCategory(item.id);
        } else {
          toggleBuilding(item.name);
        }
      } else if (query.trim()) {
        onSubmitSearch?.(query.trim());
        onClose();
      }
    }
  };

  return (
    <div className="contents">
      {/* Top Search Bar (modal only — the page lists are short enough to scroll) */}
      {variant === "modal" && (
      <div className="px-5 py-3.5 flex items-center gap-3 border-b border-neutral-150 bg-white shrink-0">
        <Search className="w-5 h-5 text-neutral-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search categories or buildings..."
          aria-label="Search categories or buildings"
          className="flex-1 bg-transparent text-neutral-900 placeholder-neutral-400 text-base sm:text-lg focus:outline-none font-normal"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              handleQueryChange("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Clear input"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Close / ESC key indicator (modal only) */}
        {variant === "modal" && (
          <kbd
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-200 hover:text-neutral-800 transition-colors"
            title="Press ESC to close"
          >
            ESC
          </kbd>
        )}
      </div>
      )}

      {/* Main Content Area (2 columns: Sidebar & List) */}
      {variant === "modal" ? (
      <div className="flex flex-1 min-h-0 divide-x divide-neutral-150">
        <aside className="w-48 sm:w-60 shrink-0 p-3 sm:p-4 flex flex-col gap-3 bg-neutral-50/80 overflow-y-auto">
          <nav aria-label="Filter groups" className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleTabChange("type")}
              aria-pressed={activeTab === "type"}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                activeTab === "type"
                  ? "bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
              }`}
            >
              <Tags className={`w-4 h-4 shrink-0 ${activeTab === "type" ? "text-neutral-900" : "text-neutral-400"}`} />
              <span>Type</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("categories")}
              aria-pressed={activeTab === "categories"}
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
              onClick={() => handleTabChange("building")}
              aria-pressed={activeTab === "building"}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                activeTab === "building"
                  ? "bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
              }`}
            >
              <Building2 className={`w-4 h-4 shrink-0 ${activeTab === "building" ? "text-neutral-900" : "text-neutral-400"}`} />
              <span>Buildings</span>
            </button>
          </nav>

          {filters && onFiltersChange && (
            <div className="border-t border-neutral-200 pt-3 space-y-3">
              <ColorDateFields
                filters={filters}
                onFiltersChange={onFiltersChange}
              />
            </div>
          )}
        </aside>

        <div
          ref={listRef}
          className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col bg-white scrollbar-thin scrollbar-thumb-neutral-200"
        >
          <div className="px-3 py-1 mb-1">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {activeTab === "categories"
                ? "Categories"
                : activeTab === "building"
                  ? "Buildings"
                  : "Type"}
            </h3>
          </div>

          <div className="space-y-1">
            {currentItems.map((item, idx) => {
              const isCategory = activeTab === "categories";
              const isType = activeTab === "type";
              return (
                <FilterOptionRow
                  key={item.id}
                  checkboxId={`palette-${activeTab}-${item.id}`}
                  icon={item.icon}
                  name={item.name}
                  count={
                    isCategory
                      ? categoryCounts.get(item.id) ?? item.baseCount
                      : isType
                        ? typeCounts.get(item.id) ?? item.baseCount
                        : buildingCounts.get(item.id) ?? item.baseCount
                  }
                  checked={
                    isCategory
                      ? filters?.categories.includes(item.id) ?? false
                      : isType
                        ? filters?.types.includes(
                            item.id as "lost" | "found",
                          ) ?? false
                        : filters?.buildings.includes(item.name) ?? false
                  }
                  disabled={!filters || !onFiltersChange}
                  highlighted={idx === highlightedIndex}
                  index={idx}
                  onToggle={() => {
                    if (isType) toggleType(item.id);
                    else if (isCategory) toggleCategory(item.id);
                    else toggleBuilding(item.name);
                  }}
                  onHighlight={() => setHighlightedIndex(idx)}
                />
              );
            })}

            {currentItems.length === 0 && (
              <div className="py-8 text-center text-neutral-400 text-sm">
                <p>No {activeTab === "categories" ? "categories" : activeTab === "building" ? "buildings" : "types"} found matching "{query}"</p>
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
        </div>
      </div>
      ) : (
      <div>
        <MobileFilterDropdown
          title="Type"
          icon={Tags}
          selectedCount={filters?.types.length ?? 0}
          open={openSection === "type"}
          onToggleOpen={() =>
            setOpenSection((current) =>
              current === "type" ? null : "type",
            )
          }
        >
          {filteredTypes.map((type) => (
            <li key={type.id}>
              <FilterOptionRow
                checkboxId={`page-filter-type-${type.id}`}
                icon={type.icon}
                name={type.name}
                count={typeCounts.get(type.id) ?? type.baseCount}
                checked={filters?.types.includes(type.id) ?? false}
                disabled={!filters || !onFiltersChange}
                highlighted={false}
                onToggle={() => toggleType(type.id)}
              />
            </li>
          ))}
        </MobileFilterDropdown>

        <MobileFilterDropdown
          title="Categories"
          icon={Layers}
          selectedCount={filters?.categories.length ?? 0}
          open={openSection === "categories"}
          onToggleOpen={() =>
            setOpenSection((current) =>
              current === "categories" ? null : "categories",
            )
          }
        >
          {filteredCategories.map((category) => (
            <li key={category.id}>
              <FilterOptionRow
                checkboxId={`page-filter-categories-${category.id}`}
                icon={category.icon}
                name={category.name}
                count={categoryCounts.get(category.id) ?? category.baseCount}
                checked={filters?.categories.includes(category.id) ?? false}
                disabled={!filters || !onFiltersChange}
                highlighted={false}
                onToggle={() => toggleCategory(category.id)}
              />
            </li>
          ))}
        </MobileFilterDropdown>

        <MobileFilterDropdown
          title="Buildings"
          icon={Building2}
          selectedCount={filters?.buildings.length ?? 0}
          open={openSection === "building"}
          onToggleOpen={() =>
            setOpenSection((current) =>
              current === "building" ? null : "building",
            )
          }
        >
          {filteredBuildings.map((building) => (
            <li key={building.id}>
              <FilterOptionRow
                checkboxId={`page-filter-buildings-${building.id}`}
                icon={building.icon}
                name={building.name}
                count={buildingCounts.get(building.id) ?? building.baseCount}
                checked={filters?.buildings.includes(building.name) ?? false}
                disabled={!filters || !onFiltersChange}
                highlighted={false}
                onToggle={() => toggleBuilding(building.name)}
              />
            </li>
          ))}
        </MobileFilterDropdown>

        <div className="space-y-3 px-4 py-4">
          <ColorDateFields
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      </div>
      )}

      <div className="px-5 py-3 border-t border-neutral-150 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onClearFilters?.()}
          disabled={!onClearFilters || filterCount === 0}
          className="text-xs font-semibold text-neutral-500 hover:text-[#E5192D] cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:text-neutral-500"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          Show{" "}
          {filterResultCount !== undefined ? (
            <span className="tabular-nums">{filterResultCount}</span>
          ) : null}{" "}
          results
        </button>
      </div>
    </div>
  );
};

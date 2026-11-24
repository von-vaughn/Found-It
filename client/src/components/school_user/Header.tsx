import React, { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
import { FadeIn } from "@/components/FadeIn";
import type { ItemFilters } from "@/components/school_user/itemFilters";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  notificationPanelOpen?: boolean;
  activeFilterCount?: number;
  filters?: ItemFilters;
  onFiltersChange?: (filters: ItemFilters) => void;
  onClearFilters?: () => void;
  filterResultCount?: number;
  isFilterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  searchInputRef,
  notificationPanelOpen = false,
  activeFilterCount = 0,
  filters,
  onFiltersChange,
  onClearFilters,
  filterResultCount,
  isFilterModalOpen,
  onFilterModalOpenChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localPaletteOpen, setLocalPaletteOpen] = useState(false);
  const isPaletteOpen = isFilterModalOpen ?? localPaletteOpen;
  const setIsPaletteOpen = (open: boolean) => {
    onFilterModalOpenChange?.(open);
    if (isFilterModalOpen === undefined) setLocalPaletteOpen(open);
  };

  return (
    <>
    <header className="h-20 bg-[#f7f7f8] dark:bg-neutral-950 sticky top-0 z-30">
      <div className="h-full w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
      <div className="notifications-shift h-full flex items-center justify-between w-full transition-[margin,width] duration-300 ease-in-out">
      {/* Search Input Bar */}
        <div className="flex-1">
          <FadeIn
            onceKey={
              user?.id
                ? `school-header-search-${user.id}`
                : "school-header-search"
            }
          >
            <div
              data-tour="school-search"
              className={`relative flex items-center gap-2 transition-[margin] duration-200 ease-out ${
                notificationPanelOpen ? "md:ml-80" : ""
              }`}
            >
              <div className="relative flex-1 min-w-0 flex items-center">
              <Search
                className="absolute left-3 h-4 w-4 text-neutral-400 dark:text-neutral-500 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search items by name…"
                aria-label="Search items by name"
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-10 text-xs text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => {
                  // On mobile filters live on their own page, not in a modal.
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    navigate("/dashboard/filters");
                    return;
                  }
                  setIsPaletteOpen(true);
                }}
                title="Filters"
                aria-label="Open filters"
                aria-expanded={isPaletteOpen}
                className={`absolute right-1.5 h-7 w-7 shrink-0 flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer ${
                  isPaletteOpen || activeFilterCount > 0
                    ? "text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200/70"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/70"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-md px-1 bg-[#E5192D] text-white text-[10px] leading-none font-bold flex items-center justify-center border-2 border-white dark:border-neutral-950 tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
      </div>
    </header>

    <SearchPaletteModal
      isOpen={isPaletteOpen}
      onClose={() => setIsPaletteOpen(false)}
      initialQuery={searchQuery}
      onSubmitSearch={(query) => {
        onSearchChange(query);
      }}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onClearFilters={onClearFilters}
      filterResultCount={filterResultCount}
    />
  </>
);
};

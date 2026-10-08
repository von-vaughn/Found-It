import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User as UserIcon, Bookmark, PlusCircle, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
import type { ItemFilters } from "@/components/school_user/itemFilters";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenReportModal?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  notificationPanelOpen?: boolean;
  activeFilterCount?: number;
  filters?: ItemFilters;
  onFiltersChange?: (filters: ItemFilters) => void;
  onClearFilters?: () => void;
  filterResultCount?: number;
  notificationsOpen?: boolean;
  isFilterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
  dashboardTypeTabsVisible?: boolean;
  filterType?: "all" | "lost" | "found";
  onFilterTypeChange?: (type: "all" | "lost" | "found") => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenReportModal,
  searchInputRef,
  notificationPanelOpen = false,
  activeFilterCount = 0,
  filters,
  onFiltersChange,
  onClearFilters,
  filterResultCount,
  notificationsOpen = false,
  isFilterModalOpen,
  onFilterModalOpenChange,
  dashboardTypeTabsVisible = false,
  filterType = "all",
  onFilterTypeChange,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [localPaletteOpen, setLocalPaletteOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const isPaletteOpen = isFilterModalOpen ?? localPaletteOpen;
  const setIsPaletteOpen = (open: boolean) => {
    onFilterModalOpenChange?.(open);
    if (isFilterModalOpen === undefined) setLocalPaletteOpen(open);
  };
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
    <header className="h-20 bg-white sticky top-0 z-30">
      <div className="h-full w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4">
      <div className={`h-full flex items-center justify-between transition-[margin,width] duration-300 ease-in-out ${
        notificationsOpen
          ? "md:ml-80 md:w-[calc(100%-20rem)]"
          : "w-full"
      }`}>
      {/* Search Input Bar */}
        <div className="flex-1 pr-4">
          <div
            className={`relative flex items-center gap-2 transition-[margin] duration-200 ease-out ${
              notificationPanelOpen ? "md:ml-80" : ""
            }`}
          >
            <AnimatePresence initial={false}>
              {dashboardTypeTabsVisible && onFilterTypeChange && (
                <motion.div
                  key="dashboard-type-tabs"
                  initial={{ width: 0, opacity: 0, x: -6 }}
                  animate={{ width: "auto", opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: -6 }}
                  transition={{
                    width: {
                      duration: reduceMotion ? 0 : 0.24,
                      ease: [0.16, 1, 0.3, 1],
                    },
                    opacity: { duration: reduceMotion ? 0 : 0.16 },
                    x: {
                      duration: reduceMotion ? 0 : 0.2,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  }}
                  className="shrink-0 overflow-hidden"
                >
                  <nav
                    aria-label="Filter items by type"
                    className="flex items-center gap-0.5 whitespace-nowrap px-1 sm:gap-2 sm:px-2"
                  >
                    {(
                      [
                        { id: "all", label: "All", compactLabel: "All" },
                        {
                          id: "lost",
                          label: "Lost Item",
                          compactLabel: "Lost",
                        },
                        {
                          id: "found",
                          label: "Found Item",
                          compactLabel: "Found",
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        aria-label={tab.label}
                        aria-pressed={filterType === tab.id}
                        onClick={() => onFilterTypeChange(tab.id)}
                        className={`relative cursor-pointer px-1 pt-1 pb-1.5 text-[11px] font-bold transition-colors sm:px-1.5 sm:text-sm ${
                          filterType === tab.id
                            ? "text-neutral-900"
                            : "text-neutral-400 hover:text-neutral-700"
                        }`}
                      >
                        <span className="sm:hidden">{tab.compactLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {filterType === tab.id && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-neutral-900"
                          />
                        )}
                      </button>
                    ))}
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative flex-1 min-w-0 flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search items by name…"
              aria-label="Search items by name"
              className="w-full h-10 px-3 bg-[#F8F9FA] rounded-lg border border-neutral-200/80 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-colors hover:bg-[#F3F4F6] focus:bg-white focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50"
            />
            </div>
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              title="Filters"
              aria-label="Open filters"
              aria-expanded={isPaletteOpen}
              className={`relative h-10 w-10 shrink-0 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer ${
                isPaletteOpen || activeFilterCount > 0
                  ? "text-neutral-900 hover:text-neutral-700"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-[#E5192D] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* User Profile Bar */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-neutral-50 transition-colors cursor-pointer group text-left"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
              <img
                src="/images/avatars/vaughn_evangelista.svg"
                alt="User avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/avatar-vaughn.jpg";
                }}
              />
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                <p className="text-xs font-bold text-neutral-900">
                  {user?.name || "Vaughn Evangelista"}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {user?.email || "vaughn@wmsu.edu.ph"}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  if (onOpenReportModal) onOpenReportModal();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#E5192D]" />
                Post New Item
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  toast.success("Viewing saved items");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left"
              >
                <Bookmark className="w-3.5 h-3.5 text-neutral-500" />
                Saved Items
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate("/");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                Landing Page
              </button>

              <div className="border-t border-neutral-100 my-1" />

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
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

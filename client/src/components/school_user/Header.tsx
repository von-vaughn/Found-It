import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Moon, Sun, User as UserIcon, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useTheme } from "@/context/useTheme";
import { useNavigate } from "react-router-dom";
import { SearchPaletteModal } from "@/components/SearchPaletteModal";
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
  notificationsOpen?: boolean;
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
  notificationsOpen = false,
  isFilterModalOpen,
  onFilterModalOpenChange,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [localPaletteOpen, setLocalPaletteOpen] = useState(false);
  const isPaletteOpen = isFilterModalOpen ?? localPaletteOpen;
  const setIsPaletteOpen = (open: boolean) => {
    onFilterModalOpenChange?.(open);
    if (isFilterModalOpen === undefined) setLocalPaletteOpen(open);
  };
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
    <header className="h-20 bg-white dark:bg-neutral-950 sticky top-0 z-30">
      <div className="h-full w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4">
      <div className={`h-full flex items-center justify-between transition-[margin,width] duration-300 ease-in-out ${
        notificationsOpen
          ? "md:ml-80 md:w-[calc(100%-20rem)]"
          : "w-full"
      }`}>
      {/* Search Input Bar */}
        <div className="flex-1 pr-0 md:pr-4">
          <div
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
        </div>

      {/* Right User Actions (desktop only — profile lives in the mobile bottom bar) */}
      <div className="hidden md:flex items-center gap-3 sm:gap-4 shrink-0">
        {/* User Profile Bar */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-label="Open profile menu"
            aria-expanded={profileDropdownOpen}
            aria-controls="account-profile-dropdown"
            className="flex items-center gap-2.5 rounded-full p-1 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer group"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shrink-0">
              <img
                src={user?.avatar || "/images/avatars/vaughn_evangelista.svg"}
                alt="User avatar"
                className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/avatars/vaughn_evangelista.svg";
                }}
              />
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform duration-150 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 ${profileDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div id="account-profile-dropdown" className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {user?.name || "Vaughn Evangelista"}
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                  {user?.email || "vaughn@wmsu.edu.ph"}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate("/dashboard/profile");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                Profile
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Dark mode"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  {theme === "dark" ? (
                    <Sun className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                  )}
                  Dark mode
                </span>
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-[#E5192D]" : "bg-neutral-200 dark:bg-neutral-700"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-4" : "translate-x-0"}`}
                  />
                </span>
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                  navigate("/");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors text-left"
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

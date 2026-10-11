import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User as UserIcon, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/useAuth";
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
    <header className="h-20 bg-white sticky top-0 z-30">
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
              className="absolute left-3 h-4 w-4 text-neutral-400 pointer-events-none"
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
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-10 text-xs text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
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
                  ? "text-neutral-900 hover:bg-neutral-200/70"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70"
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
            className="flex items-center gap-2.5 rounded-full p-1 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer group"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
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

            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 group-hover:text-neutral-600 ${profileDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div id="account-profile-dropdown" className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                  navigate("/dashboard/profile");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                Profile
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                  navigate("/");
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

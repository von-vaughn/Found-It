import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User as UserIcon, Bookmark, PlusCircle, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
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

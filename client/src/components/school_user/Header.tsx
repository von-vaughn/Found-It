import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, LogOut, User as UserIcon, Bookmark, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenReportModal?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  sidebarExpanded?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenReportModal,
  searchInputRef,
  sidebarExpanded = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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
    <header className="h-20 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="flex-1 pr-4">
        <div
          className={`relative flex items-center transition-[margin] duration-200 ease-out ${
            sidebarExpanded ? "ml-44 md:ml-40" : ""
          }`}
        >
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none stroke-[2]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lost items, categories, or location..."
            className="w-full h-10 pl-10 pr-4 bg-[#F8F9FA] hover:bg-[#F3F4F6] focus:bg-white rounded-lg border border-neutral-200/80 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-all"
          />

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
                Report New Item
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
    </header>
  );
};

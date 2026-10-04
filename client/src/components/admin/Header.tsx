import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenReportModal?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenReportModal: _onOpenReportModal,
  searchInputRef,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "OSA";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = () => {
    if (user?.role === "super_admin") return "Super Admin";
    if (user?.role === "admin") return "Staff OSA";
    return "Staff OSA";
  };

  const notifications = [
    {
      id: 1,
      title: "New claim request submitted",
      desc: "Alyssa Marie Cruz filed a verification claim for Apple AirPods Pro.",
      time: "10m ago",
      unread: true,
    },
    {
      id: 2,
      title: "Item status updated",
      desc: "Casio Scientific Calculator marked as ready for claimant pickup.",
      time: "1h ago",
      unread: true,
    },
    {
      id: 3,
      title: "Ownership verified successfully",
      desc: "Secrid Leather Wallet verified and released at OSA Front Desk.",
      time: "2h ago",
      unread: true,
    },
  ];

  return (
    <header className="h-20 bg-white border-b border-neutral-100 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="flex-1 pr-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none stroke-[2]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search claims, items, or student ID..."
            className="w-full h-10 pl-10 pr-4 bg-[#F8F9FA] hover:bg-[#F3F4F6] focus:bg-white rounded-full border border-neutral-200/80 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-all"
          />
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5 stroke-[1.8]" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#E5192D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
                <span className="font-bold text-sm text-neutral-900">
                  Notifications
                </span>
                <span className="text-[11px] font-semibold text-[#E5192D] bg-red-50 px-2 py-0.5 rounded-full">
                  3 New
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <p className="text-xs font-bold text-neutral-900">
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {n.desc}
                    </p>
                    <span className="text-[10px] text-neutral-400 mt-1 block">
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Bar */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-neutral-50 transition-colors cursor-pointer group text-left"
          >
            <Avatar
              size="sm"
              className="w-8 h-8 rounded-full border border-neutral-200 shrink-0"
            >
              <AvatarFallback className="bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>

            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-neutral-900 leading-tight group-hover:text-[#E5192D] transition-colors">
                {user?.name || "OSA Officer"}
              </span>
              <span className="text-[10.5px] text-neutral-400 font-normal leading-tight">
                {getRoleLabel()}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                <p className="text-xs font-bold text-neutral-900">
                  {user?.name || "OSA Officer"}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {user?.email || "osa@wmsu.edu.ph"}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate("/admin/dashboard");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#E5192D]" />
                Staff Dashboard
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate("/");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-left cursor-pointer"
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
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
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

export default Header;

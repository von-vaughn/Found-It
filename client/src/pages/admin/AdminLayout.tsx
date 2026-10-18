import { useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/context/useTheme";
import {
  AdminSidebar,
  type AdminNotification,
} from "@/components/admin/AdminSidebar";
import {
  initialNotifications,
  navigation,
  pageCopy,
} from "@/components/admin/adminData";
import type { AdminSection } from "@/components/admin/types";
import { takeAdminSidebarExpanded } from "@/components/admin/sidebarStickyState";
import { adminSectionPaths } from "./sectionPaths";

interface AdminLayoutProps {
  activeSection: AdminSection;
  showSearch?: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}

export function AdminLayout({
  activeSection,
  showSearch = false,
  query = "",
  onQueryChange,
  searchPlaceholder = "Search reports and claims…",
  children,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  // Restore the expanded state carried over from a nav-icon click (only set
  // when the pointer was over the sidebar). Fresh loads start collapsed.
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() =>
    takeAdminSidebarExpanded(),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<AdminNotification[]>(initialNotifications);

  const copy = pageCopy[activeSection];

  const handleNotificationSelect = (notification: AdminNotification) => {
    setNotifications((current) =>
      current.map((entry) =>
        entry.id === notification.id ? { ...entry, read: true } : entry,
      ),
    );
    setNotificationsOpen(false);
    navigate(`/admin/claims?claimId=${notification.claimId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <AdminSidebar
        activeSection={activeSection}
        navigation={navigation}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        notifications={notifications}
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        onSectionChange={(newSection: AdminSection) => {
          navigate(adminSectionPaths[newSection]);
        }}
        onNotificationSelect={handleNotificationSelect}
        onMarkAllRead={() =>
          setNotifications((current) =>
            current.map((notification) => ({ ...notification, read: true })),
          )
        }
      />

      <div
        className={`min-h-screen min-w-0 pl-16 transition-[margin] duration-300 ease-in-out ${
          sidebarExpanded ? "md:ml-60" : "md:ml-20"
        }`}
      >
      {showSearch && onQueryChange && (
        <header
          className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-3 bg-white/95 dark:bg-neutral-950/95 px-4 backdrop-blur-sm transition-[margin,width] duration-300 sm:px-6 lg:px-8 ${
            notificationsOpen ? "md:ml-80 md:w-[calc(100%-20rem)]" : "w-full"
          }`}
        >
          <div className="relative hidden min-w-0 flex-1 sm:block">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
            <input
              aria-label="Search OSA records"
              name="admin-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 pl-9 pr-3 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </header>
      )}
      {!showSearch && (
        <div className="flex justify-end px-4 pt-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      )}

        <main
          id="admin-main"
          className={`min-w-0 px-4 py-6 transition-[margin,width] duration-300 sm:px-6 lg:px-8 lg:py-8 ${
            notificationsOpen ? "md:ml-80 md:w-[calc(100%-20rem)]" : "w-full"
          }`}
        >
          <a
            href="#admin-main"
            className="sr-only focus:not-sr-only focus:mb-4 focus:inline-flex focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-2xl">
                {copy.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
                {copy.description}
              </p>
            </div>
          </div>

          {showSearch && onQueryChange && (
            <div className="mb-4 flex flex-col gap-2 sm:hidden">
              <label htmlFor="mobile-admin-search" className="sr-only">
                Search {copy.title.toLowerCase()}
              </label>
              <input
                id="mobile-admin-search"
                name="admin-search"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={`Search ${copy.title.toLowerCase()}…`}
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              />
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

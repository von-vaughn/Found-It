import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  FALLBACK_PROFILE_NAME,
  buildNotifications,
} from "@/components/school_user/notifications";
import { useAuth } from "@/context/useAuth";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type { ClaimRequest } from "@/types/claim";

interface NotificationsPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  items: propItems,
  submittedClaims = [],
  filters,
  onFiltersChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const profileName = user?.name || FALLBACK_PROFILE_NAME;
  const notifications = useMemo(
    () => buildNotifications(propItems, submittedClaims, profileName),
    [propItems, submittedClaims, profileName],
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="notifications"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div
        className={`ml-0 flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:pb-0 transition-[margin] duration-300 ${
          sidebarExpanded ? "md:ml-60" : "md:ml-20"
        }`}
      >
        <div className="hidden md:block">
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchInputRef={searchInputRef}
            notificationsOpen={notificationsOpen}
            activeFilterCount={countActiveFilters(filters)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={() => onFiltersChange(defaultFilters)}
            filterResultCount={applyAdvancedFilters(items, filters).length}
          />
        </div>

        <div
          className={`min-w-0 flex-1 transition-[margin,width] duration-300 ease-in-out ${
            notificationsOpen
              ? "md:ml-80 md:w-[calc(100%-20rem)]"
              : "w-full"
          }`}
        >
          <main className="mx-auto w-full max-w-[720px] bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-neutral-950">
            <header className="mt-2 mb-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Notifications
              </h1>
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                {notifications.length} updates
              </p>
            </header>

            <ul className="space-y-2 pb-8">
              {notifications.map((notification) =>
                notification.itemId ? (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/dashboard/items/${notification.itemId}`)
                      }
                      className="block w-full rounded-2xl border border-neutral-200/80 p-4 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:hover:bg-neutral-800"
                    >
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                        {notification.desc}
                      </p>
                      <span className="mt-1.5 block text-[11px] text-neutral-400 dark:text-neutral-500">
                        {notification.time}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li
                    key={notification.id}
                    className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800"
                  >
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {notification.desc}
                    </p>
                    <span className="mt-1.5 block text-[11px] text-neutral-400 dark:text-neutral-500">
                      {notification.time}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </main>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

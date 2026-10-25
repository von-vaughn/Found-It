import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import {
  formatNotificationTime,
  notificationStatusLabel,
} from "@/services/notificationService";
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
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    data: notifications = [],
    isLoading,
    isError,
  } = useNotifications();
  const markNotificationRead = useMarkNotificationRead();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  const handleNotificationSelect = (
    notification: (typeof notifications)[number],
  ) => {
    if (!notification.isRead) {
      markNotificationRead.mutate(notification.id, {
        onError: () =>
          toast.error("Could not update this notification. Please try again."),
      });
    }
    if (notification.itemId) {
      navigate(`/dashboard/items/${notification.itemId}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="notifications"
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div
        className="sidebar-shift ml-0 flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:pb-0 md:ml-20 transition-[margin] duration-300"
      >
        <div className="hidden md:block">
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchInputRef={searchInputRef}
            activeFilterCount={countActiveFilters(filters)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={() => onFiltersChange(defaultFilters)}
            filterResultCount={applyAdvancedFilters(items, filters).length}
          />
        </div>

        <div
          className="notifications-shift min-w-0 w-full flex-1 transition-[margin,width] duration-300 ease-in-out"
        >
          <main className="mx-auto w-full max-w-[720px] bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-neutral-950">
            <header className="mt-2 mb-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Notifications
              </h1>
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                {notifications.length} updates · {unreadCount} unread
              </p>
            </header>

            <div className="mb-3 flex justify-end">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    markAllNotificationsRead.mutate(undefined, {
                      onError: () =>
                        toast.error(
                          "Could not update notifications. Please try again.",
                        ),
                    })
                  }
                  className="text-xs font-semibold text-[#C81424] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {isLoading ? (
              <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Loading notifications…
              </p>
            ) : isError ? (
              <p role="alert" className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Could not load notifications. Please refresh and try again.
              </p>
            ) : notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                You’re all caught up.
              </p>
            ) : (
              <ul className="space-y-2 pb-8">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationSelect(notification)}
                      className={`block w-full rounded-2xl p-4 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800 max-md:rounded-none ${
                        notification.isRead
                          ? ""
                          : "bg-red-50/60 dark:bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {notification.title}
                        </p>
                        <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {notificationStatusLabel(notification.event)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                        {notification.message}
                      </p>
                      <span className="mt-1.5 block text-[11px] text-neutral-400 dark:text-neutral-500">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

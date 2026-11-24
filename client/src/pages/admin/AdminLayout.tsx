import { useMemo } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { FadeIn } from "@/components/FadeIn";
import { useAuth } from "@/context/useAuth";
import {
  AdminSidebar,
  type AdminNotification,
} from "@/components/admin/AdminSidebar";
import {
  getPageCopy,
  navigationFor,
} from "@/components/admin/adminData";
import type { AdminSection } from "@/components/admin/types";
import {
  useDeleteReadNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import {
  formatNotificationTime,
  notificationStatusLabel,
} from "@/services/notificationService";
import { paths } from "@/routes/paths";
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
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const { data: serverNotifications = [] } = useNotifications();
  const deleteReadNotifications = useDeleteReadNotifications();
  const deleteNotification = useDeleteNotification();
  const markNotificationRead = useMarkNotificationRead();
  const markAllNotificationsRead = useMarkAllNotificationsRead();

  const notifications = useMemo(
    () =>
      serverNotifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          description: notification.message,
          time: formatNotificationTime(notification.createdAt),
          requestId: notification.requestId,
          kind: notification.kind,
          status: notificationStatusLabel(notification.event),
          read: notification.isRead,
        })),
    [serverNotifications],
  );

  const copy = getPageCopy(activeSection, isSuperAdmin);

  const handleNotificationSelect = (notification: AdminNotification) => {
    if (!notification.read) {
      markNotificationRead.mutate(notification.id, {
        onError: () =>
          toast.error("Could not update this notification. Please try again."),
      });
    }
    if (notification.kind === "flag") {
      navigate(adminSectionPaths.reported);
      return;
    }
    if (notification.kind === "item") {
      navigate(adminSectionPaths.items);
      return;
    }
    if (notification.kind === "claim") {
      navigate(
        notification.requestId
          ? `${paths.adminClaims}/${encodeURIComponent(notification.requestId)}`
          : paths.adminClaims,
      );
      return;
    }
    navigate(
      notification.requestId
        ? `${paths.adminReturns}/${encodeURIComponent(notification.requestId)}`
        : `${paths.adminClaims}?tab=returns`,
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <AdminSidebar
        activeSection={activeSection}
        navigation={navigationFor(isSuperAdmin)}
        notifications={notifications}
        onSectionChange={(newSection: AdminSection) => {
          navigate(adminSectionPaths[newSection]);
        }}
        onNotificationSelect={handleNotificationSelect}
        onClearNotification={(notificationId) =>
          deleteNotification.mutate(notificationId, {
            onError: () =>
              toast.error("Could not clear this notification. Please try again."),
          })
        }
        onClearAllRead={() =>
          deleteReadNotifications.mutate(undefined, {
            onError: () =>
              toast.error("Could not clear read notifications. Please try again."),
          })
        }
        onMarkAllRead={() =>
          markAllNotificationsRead.mutate(undefined, {
            onError: () =>
              toast.error(
                "Could not update notifications. Please try again.",
              ),
          })
        }
      />

      <div
        className={`sidebar-shift min-h-screen min-w-0 pl-16 transition-[margin] duration-300 ease-in-out ${
          activeSection === "post" ? "flex flex-col md:ml-20 md:pl-0" : "md:ml-20"
        }`}
      >
      {activeSection === "post" && (
        <div className="hidden h-20 md:block" aria-hidden="true" />
      )}
      {showSearch && onQueryChange && (
        <header
          className="notifications-shift sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-3 bg-[#f7f7f8]/95 dark:bg-neutral-950/95 px-4 backdrop-blur-sm transition-[margin,width] duration-300 sm:px-6 lg:px-8"
        >
          <FadeIn
            onceKey={
              user?.id
                ? `admin-header-search-${user.id}`
                : "admin-header-search"
            }
            className="relative hidden min-w-0 flex-1 sm:block"
          >
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
          </FadeIn>
        </header>
      )}

        <main
          id="admin-main"
          className={
            activeSection === "post"
              ? "notifications-shift mx-auto min-w-0 w-full max-w-[1440px] flex-1 px-4 py-6 transition-[margin,width] duration-300 sm:px-8 sm:py-8 lg:px-12"
              : "notifications-shift min-w-0 w-full px-4 py-6 transition-[margin,width] duration-300 sm:px-6 lg:px-8 lg:py-8"
          }
        >
          <a
            href="#admin-main"
            className="sr-only focus:not-sr-only focus:mb-4 focus:inline-flex focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>

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
                placeholder={searchPlaceholder}
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

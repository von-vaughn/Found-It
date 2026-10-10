import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { rememberAdminSidebarExpanded } from "./sidebarStickyState";

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  claimId: string;
  read: boolean;
}

export interface AdminSidebarItem<TSection extends string = string> {
  id: TSection;
  label: string;
  compactLabel: string;
  icon: LucideIcon;
}

interface AdminSidebarProps<TSection extends string> {
  activeSection: TSection;
  navigation: AdminSidebarItem<TSection>[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  notifications: AdminNotification[];
  onSectionChange: (section: TSection) => void;
  onNotificationSelect: (notification: AdminNotification) => void;
  onMarkAllRead: () => void;
  onNotificationsOpenChange: (open: boolean) => void;
  notificationsOpen: boolean;
}

export function AdminSidebar<TSection extends string>({
  activeSection,
  navigation,
  expanded,
  onExpandedChange,
  notifications,
  onSectionChange,
  onNotificationSelect,
  onMarkAllRead,
  onNotificationsOpenChange,
  notificationsOpen,
}: AdminSidebarProps<TSection>) {
  const asideRef = useRef<HTMLElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );
  const unreadCount = notifications.filter(({ read }) => !read).length;

  const setPanelOpen = useCallback((open: boolean) => {
    onNotificationsOpenChange(open);
    if (open) onExpandedChange(false);
  }, [onExpandedChange, onNotificationsOpenChange]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationsPanelRef.current?.contains(event.target as Node) ||
        notificationsButtonRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setPanelOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen, setPanelOpen]);

  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 768px)");
    const updateCollapsedWidth = () =>
      setCollapsedWidth(breakpoint.matches ? 80 : 64);

    breakpoint.addEventListener("change", updateCollapsedWidth);
    return () => breakpoint.removeEventListener("change", updateCollapsedWidth);
  }, []);

  const labelsVisible = expanded && !notificationsOpen;

  return (
    <>
      <motion.aside
        ref={asideRef}
        onMouseEnter={() => {
          if (!notificationsOpen) onExpandedChange(true);
        }}
        onMouseLeave={() => {
          const activeElement = document.activeElement;
          if (
            activeElement instanceof HTMLElement &&
            asideRef.current?.contains(activeElement) &&
            activeElement.matches(":focus-visible")
          ) {
            return;
          }
          if (
            activeElement instanceof HTMLElement &&
            asideRef.current?.contains(activeElement)
          ) {
            activeElement.blur();
          }
          onExpandedChange(false);
        }}
        onFocus={() => {
          if (!notificationsOpen) onExpandedChange(true);
        }}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            (!(nextTarget instanceof Node) ||
              !event.currentTarget.contains(nextTarget)) &&
            !event.currentTarget.matches(":hover")
          ) {
            onExpandedChange(false);
          }
        }}
        initial={false}
        animate={{
          width: expanded && !notificationsOpen ? 240 : collapsedWidth,
        }}
        transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
        className="fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col items-center border-r border-neutral-200 bg-white py-5 selection:bg-[#E5192D] selection:text-white"
      >
        <Link
          to="/"
          aria-label="FoundIt home"
          className="group absolute left-2.5 top-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-neutral-50 md:left-4.5"
        >
          <img
            src="/logo.jpeg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain transition-transform group-hover:scale-105"
          />
          <span
            aria-hidden="true"
            className={`absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-neutral-900 transition-opacity duration-200 ${
              labelsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            Found<span className="text-[#E5192D]">It</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              OSA
            </span>
          </span>
        </Link>

        <nav
          aria-label="OSA workspace"
          className="absolute left-2.5 top-[5.5rem] flex flex-col items-center space-y-3 md:left-4.5"
        >
          {navigation.map(({ id, label, compactLabel, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  // Keep the sidebar open across navigation only while the
                  // pointer is over it; otherwise let the next layout mount
                  // collapsed. Moving the mouse out still closes it via
                  // onMouseLeave.
                  rememberAdminSidebarExpanded(
                    asideRef.current?.matches(":hover") ?? false,
                  );
                  onSectionChange(id);
                }}
                className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ${
                  active
                    ? "bg-rose-50 text-[#E5192D] shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                    active ? "stroke-[2.3]" : "stroke-[1.8]"
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">{compactLabel}</span>
                <span
                  aria-hidden="true"
                  className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${
                    labelsVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
          <button
            ref={notificationsButtonRef}
            type="button"
            title="Notifications"
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-expanded={notificationsOpen}
            aria-controls="admin-notification-panel"
            onClick={() => setPanelOpen(!notificationsOpen)}
            className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ${
              notificationsOpen
                ? "bg-rose-50 text-[#E5192D] shadow-xs"
                : "text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900"
            }`}
          >
            <Bell
              className="h-5 w-5 stroke-[1.8] transition-transform duration-200 group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="sr-only">Notifications</span>
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border-2 border-white bg-[#E5192D] px-0.5 text-[9px] font-bold leading-none text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${
                labelsVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              Notifications
            </span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-center gap-3 rounded-lg px-2 py-2 md:justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
              OSA
            </div>
            <div
              aria-hidden={!labelsVisible}
              className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200 ${
                labelsVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <p className="truncate text-xs font-bold text-neutral-900">
                OSA staff
              </p>
              <p className="text-[10px] text-neutral-500">Demo workspace</p>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-opacity duration-200 ${
                labelsVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {notificationsOpen && (
          <motion.aside
            ref={notificationsPanelRef}
            id="admin-notification-panel"
            aria-label="Notifications"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            style={{ left: collapsedWidth }}
            className="fixed bottom-0 top-0 z-40 flex w-[min(20rem,calc(100vw-4rem))] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-5">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Notifications
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-2.5">
              <p className="text-xs font-semibold text-neutral-600">
                {unreadCount} unread
              </p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs font-semibold text-[#C81424] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 pt-0">
                {notifications.slice(0, 4).map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      onNotificationSelect(notification);
                      setPanelOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
                      notification.read ? "" : "bg-red-50/60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.read ? "bg-transparent" : "bg-[#E5192D]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-xs ${
                          notification.read
                            ? "font-medium text-neutral-700"
                            : "font-bold text-neutral-900"
                        }`}
                      >
                        {notification.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs text-neutral-500">
                        {notification.description}
                      </span>
                      <span className="mt-1.5 block text-[10px] text-neutral-400">
                        {notification.time}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-neutral-500">
                You’re all caught up.
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

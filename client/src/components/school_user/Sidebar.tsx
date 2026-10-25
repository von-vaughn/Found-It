import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ClipboardList,
  Home,
  PlusCircle,
  Bell,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/context/useAuth";
import { type Item } from "@/data/mockItems";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  rememberSchoolSidebarExpanded,
  takeSchoolSidebarExpanded,
} from "./sidebarExpandedState";
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
import type { ClaimRequest } from "@/types/claim";

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenCreateModal?: () => void;
  hideMobileNav?: boolean;
  items?: Item[];
  submittedClaims?: ClaimRequest[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "home",
  onTabChange,
  onOpenCreateModal,
  hideMobileNav = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const deleteReadNotifications = useDeleteReadNotifications();
  const deleteNotification = useDeleteNotification();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const markNotificationRead = useMarkNotificationRead();
  const asideRef = useRef<HTMLElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNotificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [panelStartX, setPanelStartX] = useState(0);
  const [expanded, setExpanded] = useState<boolean>(() =>
    takeSchoolSidebarExpanded(),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches,
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const selectNotification = (notification: (typeof notifications)[number]) => {
    if (!notification.isRead) {
      markNotificationRead.mutate(notification.id, {
        onError: () =>
          toast.error("Could not update this notification. Please try again."),
      });
    }
    setNotificationsOpen(false);
    if (notification.itemId) {
      navigate(`/dashboard/items/${notification.itemId}`);
    }
  };

  // When navigation remounts the sidebar (e.g. Profile -> Dashboard via the
  // home icon) while the pointer stays still over it, no new `mouseenter`
  // fires so the fresh mount would start collapsed. The primary handoff is
  // the click-time flag set below; this mount check is a fallback for
  // remounts without a sidebar click (e.g. browser back/forward).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (asideRef.current?.matches(":hover")) {
        setExpanded(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // The sidebar and drawer own these layout states so opening them never
  // re-renders the page underneath (which caused the animation to drop frames).
  useLayoutEffect(() => {
    document.body.classList.toggle("sidebar-expanded", expanded);
    return () => document.body.classList.remove("sidebar-expanded");
  }, [expanded]);

  useLayoutEffect(() => {
    document.body.classList.toggle("notifications-open", notificationsOpen);
    return () => document.body.classList.remove("notifications-open");
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationsPanelRef.current?.contains(event.target as Node) ||
        notificationsButtonRef.current?.contains(event.target as Node) ||
        mobileNotificationsButtonRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 768px)");
    const updateCollapsedWidth = () => {
      setCollapsedWidth(breakpoint.matches ? 80 : 64);
      setIsDesktop(breakpoint.matches);
    };

    breakpoint.addEventListener("change", updateCollapsedWidth);
    return () => breakpoint.removeEventListener("change", updateCollapsedWidth);
  }, []);

  const toggleNotifications = () => {
    const opening = !notificationsOpen;
    if (opening) {
      // Start the drawer at the expanded sidebar's edge so it is not hidden
      // behind the sidebar while that collapses.
      setPanelStartX(expanded ? 240 - collapsedWidth : 0);
      setExpanded(false);
    }
    setNotificationsOpen(opening);
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      onClick: () => {
        if (onTabChange) onTabChange("home");
        else navigate("/dashboard");
      },
    },
    {
      id: "create",
      label: "Post Item",
      icon: PlusCircle,
      onClick: () => {
        if (onOpenCreateModal) onOpenCreateModal();
      },
    },
    {
      id: "claims",
      label: "Claims & Returned",
      icon: ClipboardList,
      onClick: () => {
        if (onTabChange) onTabChange("claims");
        else navigate("/dashboard/claims");
      },
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: toggleNotifications,
    },
  ];

  const labelsVisible = expanded && !notificationsOpen;

  return (
    <>
    <motion.aside
      ref={asideRef}
      onMouseEnter={() => {
        if (!notificationsOpen) setExpanded(true);
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
        setExpanded(false);
      }}
      onFocus={() => {
        if (!notificationsOpen) setExpanded(true);
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          (!(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)) &&
          !event.currentTarget.matches(":hover")
        ) {
          setExpanded(false);
        }
      }}
      initial={false}
      animate={{ width: expanded && !notificationsOpen ? 240 : collapsedWidth }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 hidden md:flex flex-col items-center py-5 fixed inset-y-0 left-0 z-50 selection:bg-[#E5192D] selection:text-white`}
    >
      {/* Top Logo */}
      <button
        onClick={() => navigate("/dashboard")}
        title="FoundIt Home"
        className="group absolute left-2.5 md:left-4.5 top-5 w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
      >
        <img
          src="/logo.jpeg"
          alt="FoundIt Logo"
          className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform"
        />
        <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 transition-opacity duration-200 pointer-events-none ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
          Found<span className="text-[#E5192D]">It</span>
        </span>
      </button>

      {/* Nav Items Stack */}
      <nav className="absolute left-2.5 md:left-4.5 top-[5.5rem] flex flex-col items-center space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              className="relative"
            >
              <Button
                variant="ghost"
                ref={
                  item.id === "notifications"
                    ? notificationsButtonRef
                    : undefined
                }
                onClick={() => {
                  if (item.id === "home" || item.id === "claims") {
                    // Capture hover synchronously: the click target is inside
                    // the aside, so a mouse click guarantees :hover here. The
                    // next page mount consumes this to stay expanded.
                    // Keyboard activation (no hover) correctly starts the next
                    // page collapsed.
                    rememberSchoolSidebarExpanded(
                      asideRef.current?.matches(":hover") ?? false,
                    );
                  }
                  item.onClick();
                }}
                title={item.label}
                aria-label={item.label}
                aria-expanded={
                  item.id === "notifications" ? notificationsOpen : undefined
                }
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer group border-0 p-0 ${
                  isActive || (item.id === "notifications" && notificationsOpen)
                    ? "text-[#E5192D]"
                    : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="w-11 h-11 shrink-0 flex items-center justify-center">
                  <Icon
                    className={`size-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                    }`}
                  />
                </span>

                {item.id === "notifications" && unreadCount > 0 && (
                  <Badge variant="notification" className="absolute top-1 right-1 min-w-4 h-4 rounded-md px-0.5 text-[9px] leading-none border-2 border-white dark:border-neutral-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}

                <span className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
                  {item.label}
                </span>
              </Button>

            </div>
          );
        })}
      </nav>
    </motion.aside>
    {/* Mobile bottom navigation — replaces the sidebar below md */}
    {!hideMobileNav && (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === "notifications" && notificationsOpen);
          return (
            <Button
              variant="ghost"
              key={item.id}
              ref={
                item.id === "notifications"
                  ? mobileNotificationsButtonRef
                  : undefined
              }
              onClick={() => {
                // On mobile the post form and notifications are full pages.
                if (
                  window.matchMedia("(max-width: 767px)").matches &&
                  (item.id === "create" || item.id === "notifications")
                ) {
                  navigate(
                    item.id === "create"
                      ? "/dashboard/create"
                      : "/dashboard/notifications",
                  );
                  return;
                }
                item.onClick();
              }}
              aria-label={item.label}
              aria-expanded={
                item.id === "notifications" ? notificationsOpen : undefined
              }
              className={`relative flex flex-col items-center gap-1 py-2.5 h-auto border-0 px-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
                isActive
                  ? "text-[#E5192D]"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <span className="relative flex h-6 items-center justify-center">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                  }`}
                />
                {item.id === "notifications" && unreadCount > 0 && (
                  <Badge variant="notification" className="absolute -top-1.5 -right-2.5 min-w-5 h-5 rounded-md px-1 text-[10px] leading-none border-2 border-white dark:border-neutral-900">
                    <span className="translate-y-[0.5px]">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  </Badge>
                )}
              </span>
            </Button>
          );
        })}
        <button
          onClick={() => navigate("/dashboard/profile")}
          aria-label="Profile"
          className={`relative flex flex-col items-center gap-1 py-2.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
            activeTab === "profile"
              ? "text-[#E5192D]"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <span className="flex h-6 items-center justify-center">
            <span className="h-5 w-5 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800">
              <img
                src={user?.avatar || "/images/avatars/vaughn_evangelista.svg"}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src =
                    "/images/avatars/vaughn_evangelista.svg";
                }}
              />
            </span>
          </span>
        </button>
      </div>
    </nav>
    )}
    <AnimatePresence>
      {notificationsOpen && (
        <motion.aside
          ref={notificationsPanelRef}
          aria-label="Notifications"
          initial={{ opacity: 0, x: panelStartX }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={
            isDesktop
              ? { left: collapsedWidth, willChange: "transform, opacity" }
              : undefined
          }
          className="fixed z-40 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xl max-md:inset-x-0 max-md:bottom-16 max-md:top-auto max-md:max-h-[70dvh] max-md:overflow-y-auto max-md:rounded-t-2xl max-md:border max-md:border-b-0 md:top-0 md:bottom-0 md:w-80 md:border-r"
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Notifications
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              aria-label="Close notifications"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-2.5">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {unreadCount} unread
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  markAllNotificationsRead.mutate(undefined, {
                    onError: () =>
                      toast.error(
                        "Could not mark notifications as read. Please try again.",
                      ),
                  })
                }
                disabled={markAllNotificationsRead.isPending}
                className="text-xs font-semibold text-[#C81424] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
            {unreadCount === 0 && notifications.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  deleteReadNotifications.mutate(undefined, {
                    onError: () =>
                      toast.error(
                        "Could not clear read notifications. Please try again.",
                      ),
                  })
                }
                className="text-xs font-semibold text-[#C81424] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="space-y-1 p-3">
            {notifications.slice(0, 4).map((notification) => (
              <div
                key={notification.id}
                className={`flex w-full items-start gap-2 rounded-xl p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                  notification.isRead ? "" : "bg-red-50/60 dark:bg-red-500/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectNotification(notification)}
                  className="min-w-0 flex-1 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {notification.title}
                    </span>
                    <StatusBadge
                      status={notificationStatusLabel(notification.event)}
                    />
                  </span>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {notification.message}
                  </p>
                  <span className="mt-1.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Clear notification: ${notification.title}`}
                  title="Clear notification"
                  onClick={() =>
                    deleteNotification.mutate(notification.id, {
                      onError: () =>
                        toast.error(
                          "Could not clear this notification. Please try again.",
                        ),
                    })
                  }
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                You’re all caught up.
              </p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
    </>
  );
};

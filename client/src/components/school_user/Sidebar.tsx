import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  PlusCircle,
  Bell,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { type Item } from "@/data/mockItems";
import { rememberSchoolSidebarExpanded } from "./sidebarExpandedState";
import {
  FALLBACK_PROFILE_NAME,
  buildNotifications,
} from "./notifications";
import type { ClaimRequest } from "@/types/claim";

interface SidebarProps {
  activeTab?: string;
  expanded?: boolean;
  onTabChange?: (tab: string) => void;
  onOpenCreateModal?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onNotificationsOpenChange?: (open: boolean) => void;
  items?: Item[];
  submittedClaims?: ClaimRequest[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "home",
  expanded = false,
  onTabChange,
  onOpenCreateModal,
  onExpandedChange,
  onNotificationsOpenChange,
  items: propItems,
  submittedClaims = [],
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const asideRef = useRef<HTMLElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNotificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches,
  );

  const profileName = user?.name || FALLBACK_PROFILE_NAME;

  const notifications = useMemo(
    () => buildNotifications(propItems, submittedClaims, profileName),
    [propItems, submittedClaims, profileName],
  );

  // When navigation remounts the sidebar (e.g. Profile -> Dashboard via the
  // home icon) while the pointer stays still over it, no new `mouseenter`
  // fires so the fresh mount would start collapsed. The primary handoff is
  // the click-time flag set below; this mount check is a fallback for
  // remounts without a sidebar click (e.g. browser back/forward).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (asideRef.current?.matches(":hover")) {
        onExpandedChange?.(true);
      }
    });
    return () => cancelAnimationFrame(raf);
    // Only run on mount; hover is re-checked via mouseenter afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    onNotificationsOpenChange?.(notificationsOpen);
  }, [notificationsOpen, onNotificationsOpenChange]);

  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 768px)");
    const updateCollapsedWidth = () => {
      setCollapsedWidth(breakpoint.matches ? 80 : 64);
      setIsDesktop(breakpoint.matches);
    };

    breakpoint.addEventListener("change", updateCollapsedWidth);
    return () => breakpoint.removeEventListener("change", updateCollapsedWidth);
  }, []);

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      onClick: () => {
        if (onTabChange) onTabChange("home");
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
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => {
        onExpandedChange?.(false);
        setNotificationsOpen((open) => !open);
      },
    },
  ];

  const labelsVisible = expanded && !notificationsOpen;

  return (
    <>
    <motion.aside
      ref={asideRef}
      onMouseEnter={() => {
        if (!notificationsOpen) onExpandedChange?.(true);
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
        onExpandedChange?.(false);
      }}
      onFocus={() => {
        if (!notificationsOpen) onExpandedChange?.(true);
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          (!(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)) &&
          !event.currentTarget.matches(":hover")
        ) {
          onExpandedChange?.(false);
        }
      }}
      initial={false}
      animate={{ width: expanded && !notificationsOpen ? 240 : collapsedWidth }}
      transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
      className={`shrink-0 bg-white border-r border-neutral-200 hidden md:flex flex-col items-center py-5 fixed inset-y-0 left-0 z-50 selection:bg-[#E5192D] selection:text-white`}
    >
      {/* Top Logo */}
      <button
        onClick={() => navigate("/")}
        title="FoundIt Home"
        className="group absolute left-2.5 md:left-4.5 top-5 w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl hover:bg-neutral-50 cursor-pointer"
      >
        <img
          src="/logo.jpeg"
          alt="FoundIt Logo"
          className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform"
        />
        <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-neutral-900 transition-opacity duration-200 pointer-events-none ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
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
              <button
                ref={
                  item.id === "notifications"
                    ? notificationsButtonRef
                    : undefined
                }
                onClick={() => {
                  if (item.id === "home") {
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
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer group ${
                  isActive || (item.id === "notifications" && notificationsOpen)
                    ? "bg-rose-50 text-[#E5192D] shadow-xs"
                    : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80"
                }`}
              >
                <span className="w-11 h-11 shrink-0 flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                    }`}
                  />
                </span>

                {item.id === "notifications" && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 bg-[#E5192D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white px-0.5">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}

                <span className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
                  {item.label}
                </span>
              </button>

            </div>
          );
        })}
      </nav>
    </motion.aside>
    {/* Mobile bottom navigation — replaces the sidebar below md */}
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === "notifications" && notificationsOpen);
          return (
            <button
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
              className={`relative flex flex-col items-center gap-1 py-2.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
                isActive
                  ? "text-[#E5192D]"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <span className="relative flex h-6 items-center justify-center">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                  }`}
                />
                {item.id === "notifications" && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 bg-[#E5192D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white px-0.5">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => navigate("/dashboard/profile")}
          aria-label="Profile"
          className={`relative flex flex-col items-center gap-1 py-2.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] ${
            activeTab === "profile"
              ? "text-[#E5192D]"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <span className="flex h-6 items-center justify-center">
            <span className="h-5 w-5 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
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
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </div>
    </nav>
    <AnimatePresence>
      {notificationsOpen && (
        <motion.aside
          ref={notificationsPanelRef}
          aria-label="Notifications"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
          style={isDesktop ? { left: collapsedWidth } : undefined}
          className="fixed z-40 bg-white border-neutral-200 shadow-xl max-md:inset-x-0 max-md:bottom-16 max-md:top-auto max-md:max-h-[70dvh] max-md:overflow-y-auto max-md:rounded-t-2xl max-md:border max-md:border-b-0 md:top-0 md:bottom-0 md:w-80 md:border-r"
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-100">
            <div>
              <h2 className="font-bold text-base text-neutral-900">
                Notifications
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              aria-label="Close notifications"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {notifications.map((notification) =>
              notification.itemId ? (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate(`/dashboard/items/${notification.itemId}`);
                  }}
                  className="block w-full p-3 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
                >
                  <p className="text-xs font-bold text-neutral-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                    {notification.desc}
                  </p>
                  <span className="text-[10px] text-neutral-400 mt-1.5 block">
                    {notification.time}
                  </span>
                </button>
              ) : (
                <div
                  key={notification.id}
                  className="p-3 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-bold text-neutral-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                    {notification.desc}
                  </p>
                  <span className="text-[10px] text-neutral-400 mt-1.5 block">
                    {notification.time}
                  </span>
                </div>
              ),
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
    </>
  );
};

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, Bell, LogOut, Moon, Sun, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useAuth } from "@/context/useAuth";
import { useTheme } from "@/context/useTheme";
import type { NotificationKind } from "@/services/notificationService";
import { StatusBadge } from "./StatusBadge";
import {
  rememberAdminSidebarExpanded,
  takeAdminSidebarExpanded,
} from "./sidebarStickyState";

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  requestId: string | null;
  kind: NotificationKind;
  status: string;
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
  notifications: AdminNotification[];
  unreadCount?: number;
  hasMoreNotifications?: boolean;
  isFetchingMoreNotifications?: boolean;
  onLoadMoreNotifications?: () => void;
  onSectionChange: (section: TSection) => void;
  onNotificationSelect: (notification: AdminNotification) => void;
  onClearNotification: (notificationId: string) => void;
  onClearAllRead: () => void;
  onMarkAllRead: () => void;
}

interface AdminAccountMenuProps {
  labelsVisible: boolean;
}

function AdminAccountMenu({ labelsVisible }: AdminAccountMenuProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const name =
    user?.name || (user?.role === "admin" ? "Admin" : "Staff");
  const email = user?.email || "osa@wmsu.edu.ph";

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-controls="admin-account-menu"
        title={labelsVisible ? undefined : name}
        className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100/80 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
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
        <span
          aria-hidden="true"
          className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${
            labelsVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {name}
        </span>
      </button>

      {open && (
        <div
          id="admin-account-menu"
          role="menu"
          aria-label="Account"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="mb-1 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
            <p className="truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {name}
            </p>
            <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
              {email}
            </p>
          </div>
          {user?.role === "staff" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/dashboard");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <ArrowLeftRight
                className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
              Switch to School User
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Dark mode"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <span className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              )}
              Dark mode
            </span>
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                theme === "dark" ? "bg-[#E5192D]" : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  theme === "dark" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminSidebar<TSection extends string>({
  activeSection,
  navigation,
  notifications,
  unreadCount: unreadCountProp,
  hasMoreNotifications = false,
  isFetchingMoreNotifications = false,
  onLoadMoreNotifications,
  onSectionChange,
  onNotificationSelect,
  onClearNotification,
  onClearAllRead,
  onMarkAllRead,
}: AdminSidebarProps<TSection>) {
  const asideRef = useRef<HTMLElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [panelStartX, setPanelStartX] = useState(0);
  const [expanded, setExpanded] = useState<boolean>(() =>
    takeAdminSidebarExpanded(),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );
  const unreadCount =
    unreadCountProp ?? notifications.filter(({ read }) => !read).length;

  const setPanelOpen = useCallback((open: boolean) => {
    if (open) {
      // Start the drawer at the expanded sidebar's edge so it is not hidden
      // behind the sidebar while that collapses.
      setPanelStartX(expanded ? 240 - collapsedWidth : 0);
      setExpanded(false);
    }
    setNotificationsOpen(open);
  }, [collapsedWidth, expanded]);

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
        animate={{
          width: expanded && !notificationsOpen ? 240 : collapsedWidth,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col items-center bg-white dark:bg-neutral-900 py-5 selection:bg-[#E5192D] selection:text-white"
      >
        <Link
          to="/admin"
          aria-label="FoundIt dashboard"
          className="group absolute left-2.5 top-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 md:left-4.5"
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
            className={`absolute left-full top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap text-left font-sans text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 transition-opacity duration-200 ${
              labelsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            Found<span className="text-[#E5192D]">It</span>
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
                    ? "text-[#E5192D]"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
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
                ? "text-[#E5192D]"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Bell
              className="h-5 w-5 stroke-[1.8] transition-transform duration-200 group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="sr-only">Notifications</span>
            {unreadCount > 0 && (
              <Badge
                variant="notification"
                aria-hidden="true"
                className="absolute top-1 right-1 min-w-4 h-4 rounded-md px-0.5 text-[9px] leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
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

        <div className="absolute bottom-5 left-2.5 md:left-4.5">
          <AdminAccountMenu labelsVisible={labelsVisible} />
        </div>
      </motion.aside>

      <AnimatePresence>
        {notificationsOpen && (
          <motion.aside
            ref={notificationsPanelRef}
            id="admin-notification-panel"
            aria-label="Notifications"
            initial={{ opacity: 0, x: panelStartX }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ left: collapsedWidth, willChange: "transform, opacity" }}
            className="fixed bottom-0 top-0 z-40 flex w-[min(20rem,calc(100vw-4rem))] flex-col bg-white dark:bg-neutral-900 dark:border-r dark:border-neutral-800 max-md:shadow-xl md:shadow-none"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Notifications
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-2.5">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
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
              {unreadCount === 0 && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllRead}
                  className="text-xs font-semibold text-[#C81424] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex w-full items-start gap-2 rounded-xl p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                    notification.read ? "" : "bg-red-50/60 dark:bg-red-500/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onNotificationSelect(notification);
                      setPanelOpen(false);
                    }}
                    className="min-w-0 flex-1 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
                  >
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0 break-words text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {notification.title}
                      </span>
                      <StatusBadge status={notification.status} />
                    </span>
                    <span className="mt-1 block whitespace-pre-line break-words text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {notification.description}
                    </span>
                    <span className="mt-1.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
                      {notification.time}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Clear notification: ${notification.title}`}
                    title="Clear notification"
                    onClick={() => onClearNotification(notification.id)}
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
              {onLoadMoreNotifications && (
                <LoadMoreButton
                  hasMore={hasMoreNotifications}
                  isLoading={isFetchingMoreNotifications}
                  onLoadMore={onLoadMoreNotifications}
                  compact
                />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

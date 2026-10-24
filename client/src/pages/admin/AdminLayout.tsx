import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/context/useTheme";
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
import { useAdminClaims } from "@/hooks/useClaims";
import { toClaimRequests } from "@/lib/claimAdapter";
import { adminSectionPaths } from "./sectionPaths";

function AdminAccountMenu() {
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
        className="flex h-10 items-center gap-2 rounded-full p-1 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
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
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 dark:text-neutral-500 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="admin-account-menu"
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="mb-1 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
            <p className="truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {user?.name || "Admin"}
            </p>
            <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
              {user?.email || "osa@wmsu.edu.ph"}
            </p>
          </div>
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
  const { data: serverClaims = [] } = useAdminClaims();
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const notifications = useMemo(
    () =>
      toClaimRequests(serverClaims)
        .filter((claim) => claim.status === "Pending")
        .map((claim) => ({
          id: claim.id,
          title: "Ownership claim submitted",
          description: `${claim.claimant} submitted a claim for the ${claim.item}.`,
          time: claim.submitted,
          claimId: claim.id,
          read: readNotificationIds.includes(claim.id),
        })),
    [readNotificationIds, serverClaims],
  );

  const copy = getPageCopy(activeSection, isSuperAdmin);

  const handleNotificationSelect = (notification: AdminNotification) => {
    setReadNotificationIds((current) =>
      current.includes(notification.id)
        ? current
        : [...current, notification.id],
    );
    navigate(`${adminSectionPaths.claims}?claimId=${notification.claimId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <AdminSidebar
        activeSection={activeSection}
        navigation={navigationFor(isSuperAdmin)}
        notifications={notifications}
        onSectionChange={(newSection: AdminSection) => {
          navigate(adminSectionPaths[newSection]);
        }}
        onNotificationSelect={handleNotificationSelect}
        onMarkAllRead={() =>
          setReadNotificationIds((current) => [
            ...new Set([...current, ...notifications.map((entry) => entry.id)]),
          ])
        }
      />

      <div
        className="sidebar-shift min-h-screen min-w-0 pl-16 md:ml-20 transition-[margin] duration-300 ease-in-out"
      >
      {showSearch && onQueryChange && (
        <header
          className="notifications-shift sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-3 bg-white/95 dark:bg-neutral-950/95 px-4 backdrop-blur-sm transition-[margin,width] duration-300 sm:px-6 lg:px-8"
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
          <div className="flex shrink-0 items-center gap-2">
            {isSuperAdmin && (
              <span className="hidden shrink-0 rounded-md bg-neutral-900 dark:bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white dark:text-neutral-900 dark:text-neutral-100 sm:inline-block">
                Super admin
              </span>
            )}
            <AdminAccountMenu />
          </div>
        </header>
      )}
      {!showSearch && (
        <div className="flex items-center justify-end gap-2 px-4 pt-4 sm:px-6 lg:px-8">
          <AdminAccountMenu />
        </div>
      )}

        <main
          id="admin-main"
          className="notifications-shift min-w-0 w-full px-4 py-6 transition-[margin,width] duration-300 sm:px-6 lg:px-8 lg:py-8"
        >
          <a
            href="#admin-main"
            className="sr-only focus:not-sr-only focus:mb-4 focus:inline-flex focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>
          {activeSection !== "items" && (
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0">
                {isSuperAdmin && (
                  <p className="mb-1 inline-flex rounded-md bg-neutral-900 dark:bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:text-neutral-900 dark:text-neutral-100">
                    Super admin
                  </p>
                )}
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-2xl">
                  {copy.title}
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
                  {copy.description}
                </p>
              </div>
            </div>
          )}

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

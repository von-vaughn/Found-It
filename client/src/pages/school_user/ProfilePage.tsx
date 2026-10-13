import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, PlusCircle } from "lucide-react";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { Sidebar } from "@/components/school_user/Sidebar";
import { takeSchoolSidebarExpanded } from "@/components/school_user/sidebarExpandedState";
import { useAuth } from "@/context/useAuth";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type { ClaimRequest } from "@/types/claim";

interface ProfilePageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

const DEFAULT_PROFILE = {
  name: "Vaughn Evangelista",
  email: "vaughn@wmsu.edu.ph",
  avatar: "/images/avatars/vaughn_evangelista.svg",
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem,
  filters,
  onFiltersChange,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() =>
    takeSchoolSidebarExpanded(),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<"all" | "lost" | "found">(
    "all",
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Close the mobile account menu on outside click or Escape.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const name = user?.name || DEFAULT_PROFILE.name;
  const email = user?.email || DEFAULT_PROFILE.email;
  const avatar = user?.avatar || DEFAULT_PROFILE.avatar;
  const profileUsername = name.toLowerCase().replace(/\s+/g, "_");

  const userItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.username?.toLowerCase() === profileUsername ||
          item.contactName.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    [items, name, profileUsername],
  );
  const lostItems = userItems.filter((item) => item.type === "lost").length;
  const foundItems = userItems.length - lostItems;
  const filteredUserItems =
    reportFilter === "all"
      ? userItems
      : userItems.filter((item) => item.type === reportFilter);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  const handleAddItem = (newItem: Item) => {
    onAddItem?.(newItem);
    setCreateModalOpen(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="profile"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => setCreateModalOpen(true)}
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
          <main className="mx-auto w-full max-w-[1100px] bg-white px-4 py-8 sm:px-6 lg:px-8 dark:bg-neutral-950">
            <section
              aria-labelledby="profile-identity-heading"
              className="flex flex-row items-center gap-5 pb-7"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <img
                  src={avatar}
                  alt={`${name}'s profile`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PROFILE.avatar;
                  }}
                />
              </div>
              <div className="relative min-w-0 flex-1" ref={profileMenuRef}>
                <span className="flex items-center gap-1.5">
                  <h2
                    id="profile-identity-heading"
                    className="break-words text-xl font-bold text-neutral-900 dark:text-neutral-100"
                  >
                    {name}
                  </h2>
                  <span className="shrink-0 md:hidden">
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((open) => !open)}
                      aria-label="Open account menu"
                      aria-expanded={profileMenuOpen}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-150 ${profileMenuOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </span>
                </span>
                {profileMenuOpen && (
                  <span className="absolute right-0 top-full z-30 mt-2 block w-48 rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl md:hidden dark:border-neutral-800 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                            setProfileMenuOpen(false);
                            logout();
                            navigate("/");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </button>
                  </span>
                )}
                <p className="mt-1 break-all text-sm text-neutral-600 dark:text-neutral-400">
                  {email}
                </p>
              </div>
            </section>

            <section aria-labelledby="profile-reports-heading" className="pb-10">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
                <div>
                  <h2
                    id="profile-reports-heading"
                    className="text-base font-bold text-neutral-900 dark:text-neutral-100"
                  >
                    Your item reports
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {userItems.length} total · {lostItems} lost · {foundItems}{" "}
                    found
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // On mobile the post form is a full page, not a modal.
                    if (window.matchMedia("(max-width: 767px)").matches) {
                      navigate("/dashboard/create");
                      return;
                    }
                    setCreateModalOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Post an item
                </button>
              </div>

              {userItems.length > 0 ? (
                <>
                  <nav
                    aria-label="Filter your reports by type"
                    className="mt-5 flex items-center gap-4"
                  >
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "lost", label: "Lost Item" },
                        { id: "found", label: "Found Item" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setReportFilter(tab.id)}
                        aria-pressed={reportFilter === tab.id}
                        className={`relative px-1 py-1 text-sm font-bold transition-colors ${
                          reportFilter === tab.id
                            ? "text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                        }`}
                      >
                        {tab.label}
                        {reportFilter === tab.id && (
                          <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] rounded-full bg-neutral-900 dark:bg-neutral-100" />
                        )}
                      </button>
                    ))}
                  </nav>

                  {filteredUserItems.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredUserItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onItemClick={(selected) =>
                        navigate(`/dashboard/items/${selected.id}`, {
                          state: { from: "/dashboard/profile" },
                        })
                      }
                    />
                  ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        No {reportFilter === "lost" ? "lost" : "found"} reports
                        yet
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                        You haven&apos;t reported any {reportFilter} items.
                      </p>
                      <button
                        type="button"
                        onClick={() => setReportFilter("all")}
                        className="mt-4 text-xs font-bold text-[#E5192D] hover:underline"
                      >
                        Show all reports
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-10 text-center">
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    No item reports yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                    Items you report will appear here so you can quickly find
                    them again.
                  </p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
};

export default ProfilePage;

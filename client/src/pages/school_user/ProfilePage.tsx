import { useMyItems } from "@/hooks/useItems";
import { toClientItems } from "@/lib/itemAdapter";
import { resolveIdNumber } from "@/lib/idNumber";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Plus } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import { FadeIn } from "@/components/FadeIn";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { Sidebar } from "@/components/school_user/Sidebar";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { useAuth } from "@/context/useAuth";
import { EMPTY_ITEMS } from "@/data/mockItems";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type { ClaimRequest } from "@/types/claim";

interface ProfilePageProps {
  submittedClaims?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

const DEFAULT_PROFILE = {
  name: "Vaughn Evangelista",
  email: "ve202100318@wmsu.edu.ph",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function AnimatedCount({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduceMotion ? value : 0));
  const prevValueRef = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(prevValueRef.current, value, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    prevValueRef.current = value;
    return () => controls.stop();
  }, [value, reduceMotion]);

  return <>{reduceMotion ? value : display}</>;
}

function EmptySearchIllustration() {
  return (
    <div
      aria-hidden="true"
      className="flex h-52 w-full shrink-0 items-center justify-center rounded-3xl border border-neutral-200/70 bg-neutral-50/40 sm:h-56 sm:w-64 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <svg
        viewBox="0 0 88 88"
        fill="none"
        className="h-24 w-24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="38"
          cy="38"
          r="21"
          className="stroke-neutral-500 dark:stroke-neutral-400"
          strokeWidth="2.5"
        />
        <path
          d="M53.5 53.5L70 70"
          stroke="#E5192D"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M38 29V47M29 38H47"
          stroke="#E5192D"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  submittedClaims = [],
  filters,
  onFiltersChange,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "lost" | "found">(
    "all",
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
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

  const reduceMotion = useReducedMotion();
  const name = user?.name || DEFAULT_PROFILE.name;
  const email = user?.email || DEFAULT_PROFILE.email;
  const idNumber = resolveIdNumber(user?.schoolId ?? user?.studentId, email);
  const initials = getInitials(name);
  const customAvatar = !avatarFailed ? user?.avatar : undefined;

  // Fetch the current user's own reports from the API.
  const { data: serverMyItems } = useMyItems({
    staleTime: 30_000,
    retry: 1,
  });
  const apiMyItems = serverMyItems ? toClientItems(serverMyItems) : null;
  const userItems = (apiMyItems ?? EMPTY_ITEMS).filter(
    (item) => item.type !== "found" || !item.isReturned,
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

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="profile"
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div className="sidebar-shift ml-0 flex min-h-screen min-w-0 flex-1 flex-col pb-20 transition-[margin] duration-300 md:ml-20 md:pb-0">
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

        <main className="mx-auto w-full max-w-[1440px] flex-1 bg-white px-4 py-8 sm:px-8 lg:px-12 dark:bg-neutral-950">
          <div className="notifications-shift min-w-0 w-full transition-[margin,width] duration-300 ease-in-out">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-14">
              {/* Left Profile Rail */}
              <section aria-labelledby="profile-identity-heading">
                <motion.div
                  className="relative inline-block"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] text-2xl font-bold tracking-tight ${
                      customAvatar
                        ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        : "bg-[#E5192D] text-white"
                    }`}
                  >
                    {customAvatar ? (
                      <img
                        src={customAvatar}
                        alt={`${name}'s profile`}
                        className="h-full w-full object-cover"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span aria-hidden="true">{initials}</span>
                    )}
                  </div>
                  <motion.span
                    aria-hidden="true"
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.18,
                      duration: 0.28,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-neutral-950"
                  />
                </motion.div>

                <FadeIn delay={0.05}>
                  <div className="relative mt-5" ref={profileMenuRef}>
                    <div className="flex items-center justify-between gap-2">
                      <h1
                        id="profile-identity-heading"
                        className="break-words text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
                      >
                        {name}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setProfileMenuOpen((open) => !open)}
                        aria-label="Open account menu"
                        aria-expanded={profileMenuOpen}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 md:hidden dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-150 ${profileMenuOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl md:hidden dark:border-neutral-800 dark:bg-neutral-900">
                        <button
                          type="button"
                          onClick={async () => {
                            setProfileMenuOpen(false);
                            await logout();
                            navigate("/");
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </FadeIn>

                <FadeIn delay={0.1}>
                  <dl className="mt-6 divide-y divide-neutral-200/80 border-y border-neutral-200/80 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-4 py-3.5">
                      <dt className="shrink-0 text-neutral-500 dark:text-neutral-400">
                        ID number
                      </dt>
                      <dd className="break-all text-right font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {idNumber || "N/A"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3.5">
                      <dt className="shrink-0 text-neutral-500 dark:text-neutral-400">
                        Email
                      </dt>
                      <dd className="break-all text-right font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {email}
                      </dd>
                    </div>
                  </dl>
                </FadeIn>

                <FadeIn delay={0.15}>
                  <dl className="grid grid-cols-3 divide-x divide-neutral-200/80 pt-5 dark:divide-neutral-800">
                    <div className="pr-4">
                      <dd className="font-mono text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                        <AnimatedCount value={userItems.length} />
                      </dd>
                      <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                        Total
                      </dt>
                    </div>
                    <div className="px-4">
                      <dd className="font-mono text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                        <AnimatedCount value={lostItems} />
                      </dd>
                      <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                        Lost
                      </dt>
                    </div>
                    <div className="pl-4">
                      <dd className="font-mono text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                        <AnimatedCount value={foundItems} />
                      </dd>
                      <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                        Found
                      </dt>
                    </div>
                  </dl>
                </FadeIn>
              </section>

              {/* Right Reports Column */}
              <section
                aria-labelledby="profile-reports-heading"
                className="min-w-0 pb-10"
              >
                <FadeIn delay={0.05}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                    My reports
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
                    <h2
                      id="profile-reports-heading"
                      className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
                    >
                      Your item reports
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard/create")}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#E5192D] px-5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Post an item
                    </button>
                  </div>
                </div>

                <nav
                  aria-label="Filter your reports by type"
                  className="mt-6 flex flex-wrap items-center gap-1.5"
                >
                  {(
                    [
                      { id: "all", label: "All", count: userItems.length },
                      { id: "lost", label: "Lost", count: lostItems },
                      { id: "found", label: "Found", count: foundItems },
                    ] as const
                  ).map((tab) => {
                    const isActive = reportFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setReportFilter(tab.id)}
                        aria-pressed={isActive}
                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                          isActive
                            ? "border-[#E5192D] bg-[#E5192D] text-white"
                            : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className="font-mono tabular-nums opacity-80">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                </FadeIn>

                {userItems.length === 0 ? (
                  <FadeIn delay={0.08}>
                  <div className="mt-7 flex flex-col-reverse gap-8 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-md">
                      <h3 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Nothing reported yet.
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                        Lost something, or found something that isn&apos;t yours?
                        Post it here and the people looking can find it.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigate("/dashboard/create?type=lost")}
                          className="inline-flex h-10 items-center justify-center rounded-full bg-[#E5192D] px-5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                        >
                          I lost something
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/dashboard/create?type=found")
                          }
                          className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-200 bg-white px-5 text-xs font-bold text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                        >
                          I found something
                        </button>
                      </div>
                    </div>

                    <EmptySearchIllustration />
                  </div>
                  </FadeIn>
                ) : filteredUserItems.length > 0 ? (
                  <StaggerGrid
                    key={`${reportFilter}-${filteredUserItems.length}-${filteredUserItems[0]?.id ?? ""}`}
                    className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {filteredUserItems.map((item) => (
                      <StaggerItem
                        key={item.id}
                        className="w-full min-w-0 [&>div]:h-full"
                      >
                        <ItemCard
                          item={item}
                          onItemClick={(selected) =>
                            navigate(`/dashboard/items/${selected.id}`, {
                              state: { from: "/dashboard/profile" },
                            })
                          }
                        />
                      </StaggerItem>
                    ))}
                  </StaggerGrid>
                ) : (
                  <FadeIn key={reportFilter} delay={0.05}>
                  <div className="mt-7 py-10 text-center">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      No {reportFilter === "lost" ? "lost" : "found"} reports
                      yet
                    </h3>
                    <button
                      type="button"
                      onClick={() => setReportFilter("all")}
                      className="mt-4 text-xs font-bold text-[#E5192D] hover:underline"
                    >
                      Show all reports
                    </button>
                  </div>
                  </FadeIn>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;

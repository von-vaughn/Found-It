import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  Palette,
  SearchX,
  Tag,
} from "lucide-react";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import {
  simplifiedClaimStatusStyles,
  simplifyClaimStatus,
  type SimplifiedClaimStatus,
} from "@/components/school_user/claimStatus";
import { NoItemImage } from "@/components/NoItemImage";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { useAuth } from "@/context/useAuth";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type { ClaimRequest } from "@/types/claim";
import { FALLBACK_PROFILE_NAME } from "@/components/school_user/notifications";
import { takeSchoolSidebarExpanded } from "@/components/school_user/sidebarExpandedState";

interface MyClaimsPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

type StatusFilter = "all" | SimplifiedClaimStatus;

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Pending", label: "Pending" },
  { id: "Approved", label: "Approved" },
  { id: "Claimed", label: "Claimed" },
  { id: "Rejected", label: "Rejected" },
];

function ClaimPhotosCarousel({
  claimId,
  itemTitle,
  postImage,
  detailImages,
}: {
  claimId: string;
  itemTitle: string;
  postImage?: string;
  detailImages: string[];
}) {
  const photos = [
    ...(postImage ? [{ src: postImage, alt: itemTitle }] : []),
    ...detailImages.map((src, index) => ({
      src,
      alt: `Evidence ${index + 1} for request ${claimId}`,
    })),
  ];
  const [index, setIndex] = useState(0);
  const total = photos.length;
  if (total === 0) {
    return (
      <NoItemImage
        title="No photo on this post"
        className="aspect-[16/10] w-full rounded-xl"
      />
    );
  }
  const safeIndex = index % total;
  const current = photos[safeIndex];

  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800">
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          loading="lazy"
          className="aspect-[16/10] w-full object-cover"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + total) % total)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % total)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
              {safeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {photos.map((_, dotIndex) => (
            <button
              key={`${claimId}-photo-dot-${dotIndex}`}
              type="button"
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to photo ${dotIndex + 1}`}
              className={`h-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                dotIndex === safeIndex
                  ? "w-5 bg-neutral-900"
                  : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const MyClaimsPage: React.FC<MyClaimsPageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem,
  filters,
  onFiltersChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() =>
    takeSchoolSidebarExpanded(),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const profileName = user?.name || FALLBACK_PROFILE_NAME;

  const myClaims = useMemo(() => {
    return submittedClaims.filter(
      (claim) =>
        claim.claimant.trim().toLowerCase() ===
        profileName.trim().toLowerCase(),
    );
  }, [submittedClaims, profileName]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let claimed = 0;
    let rejected = 0;
    for (const claim of myClaims) {
      const simple = simplifyClaimStatus(claim.status);
      if (simple === "Pending") pending += 1;
      else if (simple === "Approved") approved += 1;
      else if (simple === "Claimed") claimed += 1;
      else rejected += 1;
    }
    return { total: myClaims.length, pending, approved, claimed, rejected };
  }, [myClaims]);

  const filteredClaims = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return myClaims.filter((claim) => {
      if (
        statusFilter !== "all" &&
        simplifyClaimStatus(claim.status) !== statusFilter
      ) {
        return false;
      }
      if (!query) return true;
      const item = items.find((entry) => entry.id === claim.itemId);
      return [
        claim.item,
        claim.claimantTitle ?? "",
        claim.color ?? "",
        claim.building ?? "",
        claim.location,
        claim.details,
        item?.title ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [myClaims, statusFilter, searchQuery, items]);

  const groupedByPost = useMemo(() => {
    const groups = new Map<string, ClaimRequest[]>();
    for (const claim of filteredClaims) {
      const list = groups.get(claim.itemId) ?? [];
      list.push(claim);
      groups.set(claim.itemId, list);
    }
    return [...groups.entries()];
  }, [filteredClaims]);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const handleAddItem = (newItem: Item) => {
    onAddItem?.(newItem);
    setCreateModalOpen(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950 font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <Sidebar
        activeTab="claims"
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
        <div className="hidden md:block sticky top-0 z-30">
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
          <main className="mx-auto w-full max-w-[1100px] bg-white dark:bg-neutral-950 px-4 py-8 sm:px-6 lg:px-8">
            <header>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                My claim requests
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Requests you filed on found posts. Select a post to see the
                original report.
              </p>
            </header>

            <nav
              aria-label="Filter claim requests by status"
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-3"
            >
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? counts.total
                    : tab.id === "Pending"
                      ? counts.pending
                      : tab.id === "Approved"
                        ? counts.approved
                        : tab.id === "Claimed"
                          ? counts.claimed
                          : counts.rejected;
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`relative px-1 py-1 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${
                      isActive
                        ? "text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </nav>

            {groupedByPost.length > 0 ? (
              <StaggerGrid key={statusFilter} className="mt-6 space-y-6">
                {groupedByPost.map(([itemId, claims]) => {
                  const item = itemById.get(itemId);
                  return (
                    <StaggerItem key={itemId}>
                    <section
                      aria-label={`Requests for ${claims[0]?.item ?? "post"}`}
                      className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900 p-4 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                            {item?.title ?? claims[0]?.item ?? "Post"}
                          </h2>
                          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {claims.length}{" "}
                            {claims.length === 1 ? "request" : "requests"} ·{" "}
                            {item?.location ?? claims[0]?.location ?? ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/dashboard/items/${itemId}`, {
                              state: { from: "/dashboard/claims" },
                            })
                          }
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                        >
                          View post
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {claims.map((claim) => {
                          const simple = simplifyClaimStatus(claim.status);
                          const detailImages = (claim.evidence ?? []).filter(
                            (src) => src !== item?.image,
                          );
                          return (
                            <li key={claim.id} className="p-4 sm:p-5">
                              <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                                <ClaimPhotosCarousel
                                  claimId={claim.id}
                                  itemTitle={item?.title ?? claim.item}
                                  postImage={item?.image}
                                  detailImages={detailImages}
                                />
                                <div className="flex min-w-0 flex-col">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                                      Submitted {claim.submitted}
                                    </p>
                                    <span
                                      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold ${simplifiedClaimStatusStyles[simple]}`}
                                    >
                                      {simple}
                                    </span>
                                  </div>
                                  <div className="mt-1.5">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                      Description
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                                      {claim.details}
                                    </p>
                                  </div>
                                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <Tag
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    What is it?
                                  </dt>
                                  <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                    {claim.claimantTitle?.trim() || claim.item}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <Palette
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    Primary color
                                  </dt>
                                  <dd className="mt-1 font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                                    {claim.color?.trim() || "Not provided"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <CalendarDays
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    Date lost
                                  </dt>
                                  <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                    {claim.dateLost}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <Clock3
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    Time lost
                                  </dt>
                                  <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                    {claim.timeLost}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <MapPin
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    Location lost
                                  </dt>
                                  <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                    {claim.location}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                    <Building2
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    Building
                                  </dt>
                                  <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                    {claim.building?.trim() || "Not provided"}
                                  </dd>
                                </div>
                              </dl>
                              {claim.importantDetails?.trim() && (
                                <div className="mt-3">
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                    Important details
                                  </h4>
                                  <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                                    {claim.importantDetails}
                                  </p>
                                </div>
                              )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                    </StaggerItem>
                  );
                })}
              </StaggerGrid>
            ) : (
              <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
                  {searchQuery || statusFilter !== "all" ? (
                    <SearchX
                      className="h-8 w-8 stroke-[1.5]"
                      aria-hidden="true"
                    />
                  ) : (
                    <ClipboardList
                      className="h-8 w-8 stroke-[1.5]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {statusFilter !== "all"
                    ? `No ${statusFilter.toLowerCase()} requests`
                    : searchQuery.trim()
                      ? "No matching requests"
                      : "No claim requests yet"}
                </h2>
                {!searchQuery.trim() && statusFilter === "all" && (
                  <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                    Requests you file on found posts will appear here with their
                    approval status.
                  </p>
                )}
                {!searchQuery.trim() && statusFilter === "all" && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5192D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                  >
                    Browse found items
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
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

export default MyClaimsPage;

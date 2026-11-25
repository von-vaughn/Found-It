import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/school_user/Sidebar";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { FadeIn } from "@/components/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { FoundItemCameraModal } from "@/components/school_user/FoundItemCameraModal";
import { OwnershipClaimModal } from "@/components/school_user/OwnershipClaimModal";
import { ReportPostDialog } from "@/components/school_user/ReportPostDialog";
import { formatCategoryLabel } from "@/hooks/useCategories";
import { EMPTY_ITEMS } from "@/data/mockItems";
import { NoItemImage } from "@/components/NoItemImage";
import { useAuth } from "@/context/useAuth";
import {
  useItemDetail,
  useDeleteItem,
  useItems,
  useSuggestedMatches,
} from "@/hooks/useItems";
import { useItemReturns } from "@/hooks/useReturns";
import { toClientItem, toClientItems } from "@/lib/itemAdapter";
import { toFoundReportClaims } from "@/lib/claimAdapter";
import { parseItemEventDate } from "@/lib/date";
import { UUID_RE } from "@/services/itemService";
import type {
  ClaimRequest,
  NewClaimRequest,
} from "@/types/claim";
import { ClaimEvidenceGallery } from "@/components/school_user/ClaimEvidenceGallery";
import {
  simplifiedClaimStatusStyles,
  simplifyClaimStatus,
  submissionStatusLabel,
} from "@/components/school_user/claimStatus";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

interface ItemDetailPageProps {
  submittedClaims?: ClaimRequest[];
  foundReports?: ClaimRequest[];
  onSubmitClaim?: (claim: NewClaimRequest) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

const finderStatusStyles: Record<string, string> = {
  Pending:
    "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-200",
  "Pending admin approval":
    "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-200",
  Approved: "bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200",
  Claimed: "bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
  Returned: "bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200",
  Rejected: "bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200",
};

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  submittedClaims = [],
  foundReports = [],
  onSubmitClaim,
  filters,
  onFiltersChange,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const sidebarActiveTab =
    locationState?.from === "/dashboard/profile"
      ? "profile"
      : locationState?.from === "/dashboard/claims"
        ? "claims"
        : "home";
  const { user } = useAuth();
  const items = EMPTY_ITEMS;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const { data: serverItem, isLoading: isItemLoading } = useItemDetail(id ?? "");
  const { data: serverItems } = useItems(undefined, {
    staleTime: 30_000,
    retry: 1,
  });
  const deleteItemMutation = useDeleteItem();

  const item = useMemo(() => {
    if (serverItem) return toClientItem(serverItem);
    return items.find((entry) => entry.id === id);
  }, [serverItem, items, id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [foundItemCameraOpen, setFoundItemCameraOpen] = useState(false);
  const [ownershipClaimOpen, setOwnershipClaimOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener (same as dashboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Opening another item from the related list swaps the route id without
  // remounting the page; bring the new item's details into view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setSelectedImageIndex(0);
    setReportDialogOpen(false);
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Searching from the detail page jumps back to the feed with the
    // query applied, mirroring dashboard search behavior.
    navigate(query.trim() ? `/dashboard?q=${encodeURIComponent(query.trim())}` : "/dashboard", {
      replace: true,
    });
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!item) return;
    if (UUID_RE.test(item.id)) {
      try {
        await deleteItemMutation.mutateAsync(item.id);
      } catch (err) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Failed to delete item from server.";
        console.error("Failed to delete item on server:", err);
        toast.error(message);
        return;
      }
    }
    setDeleteDialogOpen(false);
    toast.success("Your report was deleted.");
    navigate("/dashboard");
  };

  // Related posts come from the backend list, not the example-content props:
  // same category, same lost/found type, excluding the item being viewed.
  const apiItems = useMemo(
    () => (serverItems ? toClientItems(serverItems) : []),
    [serverItems],
  );

  const relatedItems = useMemo(() => {
    if (!item) return [];
    return apiItems
      .filter(
        (entry) =>
          entry.id !== item.id &&
          entry.category === item.category &&
          entry.type === item.type,
      )
      .slice(0, 4);
  }, [apiItems, item]);

  const isOwnItem = Boolean(
    serverItem && user?.id && serverItem.reporterId === user.id,
  );

  const isOwnLostItem = Boolean(
    isOwnItem &&
    (item?.type === "lost" || serverItem?.reportType === "lost"),
  );
  const { data: serverSuggestedMatches = [] } = useSuggestedMatches(
    item?.id,
    isOwnLostItem,
  );
  const suggestedMatches = useMemo(
    () => toClientItems(serverSuggestedMatches),
    [serverSuggestedMatches],
  );
  const { data: serverItemReturns = [] } = useItemReturns(
    isOwnLostItem ? item?.id : undefined,
  );
  const serverReturnClaims = useMemo(
    () => toFoundReportClaims(serverItemReturns),
    [serverItemReturns],
  );

  const finderReports = useMemo(() => {
    if (!item) return [];
    const all = [...serverReturnClaims, ...submittedClaims];
    const seen = new Set<string>();
    return all.filter((claim) => {
      if (claim.itemId !== item.id) return false;
      if (seen.has(claim.id)) return false;
      seen.add(claim.id);
      return true;
    });
  }, [item, serverReturnClaims, submittedClaims]);

  const existingClaim = useMemo(() => {
    if (!item) return null;
    return (
      submittedClaims.find(
        (claim) => claim.itemId === item.id && claim.status !== "Rejected",
      ) ?? null
    );
  }, [item, submittedClaims]);

  const existingFoundReport = useMemo(() => {
    if (!item) return null;
    return (
      foundReports.find(
        (report) => report.kind === "return" && report.itemId === item.id,
      ) ?? null
    );
  }, [item, foundReports]);

  const foundReportStatus = existingFoundReport
    ? submissionStatusLabel(existingFoundReport)
    : null;
  const foundReportStatusStyle =
    foundReportStatus !== null
      ? simplifiedClaimStatusStyles[foundReportStatus]
      : "";

  if (isItemLoading && !item) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 flex font-open-sans text-neutral-900 dark:text-neutral-100">
        <Sidebar
          activeTab={sidebarActiveTab}
          onTabChange={(tab) => {
            if (tab === "claims") navigate("/dashboard/claims");
            else navigate("/dashboard");
          }}
          onOpenCreateModal={() => navigate("/dashboard/create")}
        />
        <div className="sidebar-shift flex-1 min-w-0 ml-0 md:ml-20 flex flex-col min-h-screen pb-20 md:pb-0 transition-[margin] duration-300">
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#E5192D]" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 flex font-open-sans text-neutral-900 dark:text-neutral-100">
        <Sidebar
          activeTab={sidebarActiveTab}
          onTabChange={(tab) => {
            if (tab === "claims") navigate("/dashboard/claims");
            else navigate("/dashboard");
          }}
          onOpenCreateModal={() => navigate("/dashboard/create")}
        />
        <div className="sidebar-shift flex-1 min-w-0 ml-0 md:ml-20 flex flex-col min-h-screen pb-20 md:pb-0 transition-[margin] duration-300">
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
          <div
            className="notifications-shift min-w-0 w-full flex-1 transition-[margin,width] duration-300 ease-in-out"
          >
            <div className="flex h-full items-center justify-center px-8 py-16">
              <FadeIn>
                <main className="max-w-sm text-center">
                  <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100 text-balance">
                    Item not found
                  </h1>
                  <p className="mt-2 break-words text-sm text-neutral-500 dark:text-neutral-400">
                    The item you are looking for may have been removed or the link
                    is incorrect.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Go back
                  </button>
                </main>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLost = item.type === "lost";
  const { eventDate, hasTime } = parseItemEventDate(item.dateTime, item.date);
  const itemDate = eventDate
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
        eventDate,
      )
    : null;
  const itemTime =
    eventDate && hasTime
      ? new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(
          eventDate,
        )
      : null;
  const galleryImages =
    item.images && item.images.length > 0
      ? item.images
      : item.image
        ? [item.image]
        : [];
  const activeHeroImage =
    galleryImages[selectedImageIndex] ?? galleryImages[0] ?? "";

  return (
    <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 flex font-open-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <a
        href="#item-detail-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-20 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        Skip to item details
      </a>
      <Sidebar
        activeTab={sidebarActiveTab}
        onTabChange={(tab) => {
            if (tab === "claims") navigate("/dashboard/claims");
            else navigate("/dashboard");
          }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div className="sidebar-shift flex-1 min-w-0 ml-0 md:ml-20 flex flex-col min-h-screen pb-20 md:pb-0 transition-[margin] duration-300">
        {/* Same search header as the dashboard */}
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

        <div className="flex-1 min-w-0 w-full max-w-[1440px] mx-auto bg-[#f7f7f8] dark:bg-neutral-950 px-4 sm:px-8 lg:px-12">
          <div className="notifications-shift min-w-0 w-full transition-[margin,width] duration-300 ease-in-out">
        {/* Detail actions row */}
        <FadeIn key={`actions-${item.id}`}>
        <div className="pt-4 flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleGoBack}
            className="-ml-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </button>
          <div className="flex items-center gap-2">
            {isOwnItem ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/items/${item.id}/edit`)}
                  aria-label="Edit this report"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label="Delete this report"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#B42332] transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#9F1424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : item.hasReported ? (
              <button
                type="button"
                disabled
                title="You have already reported this post."
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 text-xs font-bold text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                Post reported
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.error("Please sign in to report a post.");
                    return;
                  }
                  setReportDialogOpen(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#E5192D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                Report post
              </button>
            )}
          </div>
        </div>
        </FadeIn>
        <main
          id="item-detail-main"
          className="min-w-0 w-full py-6 space-y-6"
        >
          {/* Hero: picture left, details right (no enclosing card) */}
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* Hero image — fixed frame so every item measures the same */}
          <FadeIn key={`hero-${item.id}`} delay={0.04} className="min-w-0 space-y-3">
            {activeHeroImage ? (
              <div className="relative aspect-[4/3] max-h-[560px] w-full overflow-hidden rounded-3xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800">
                <img
                  src={activeHeroImage}
                  alt={item.title}
                  width={1200}
                  height={900}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <NoItemImage
                title="No image attached to this report."
                className="aspect-[4/3] max-h-[560px] w-full rounded-3xl"
              />
            )}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((imgUrl, index) => (
                  <button
                    key={`${imgUrl}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                      index === selectedImageIndex
                        ? "border-[#E5192D]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </FadeIn>

          {/* Details (not in a card) */}
          <FadeIn key={`details-${item.id}`} delay={0.08} className="min-w-0">
          <article className="min-w-0">
            {/* Reporter profile on top */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {item.title}
                </h1>
                <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                  {item.timeAgo}
                </p>
              </div>
              {!isOwnItem &&
                (existingFoundReport ? (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/claims")}
                    title="You already submitted a found report for this item."
                    className={`shrink-0 inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer ${foundReportStatusStyle}`}
                  >
                    {foundReportStatus} found report
                  </button>
                ) : existingClaim ? (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/claims")}
                    title="You already submitted a claim for this item."
                    className={`shrink-0 inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer ${simplifiedClaimStatusStyles[simplifyClaimStatus(existingClaim.status)]}`}
                  >
                    {simplifyClaimStatus(existingClaim.status)} claim request
                  </button>
                ) : item.isClaimed || item.isReturned ? (
                  <span className="shrink-0 inline-flex h-10 items-center justify-center rounded-full bg-neutral-100 px-4 text-xs font-bold text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                    {isLost ? "Already returned" : "Already claimed"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isLost) {
                        // On mobile the found flow is a full page, not a modal.
                        if (window.matchMedia("(max-width: 767px)").matches) {
                          navigate(`/dashboard/items/${item.id}/found-report`);
                          return;
                        }
                        setFoundItemCameraOpen(true);
                        return;
                      }
                      // On mobile the claim flow is a full page, not a modal.
                      if (window.matchMedia("(max-width: 767px)").matches) {
                        navigate(`/dashboard/items/${item.id}/claim`);
                        return;
                      }
                      setOwnershipClaimOpen(true);
                    }}
                    className="shrink-0 h-10 px-5 rounded-full bg-[#E5192D] text-white text-xs font-bold transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {isLost ? "I Found This" : "This Is Mine"}
                  </button>
                ))}
            </div>

            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              {isLost ? "Lost item report" : "Found item report"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 break-words">
              {item.description}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-x-6 border-y border-neutral-200/80 dark:border-neutral-800 text-xs sm:grid-cols-2">
              {item.color && (
                <div className="min-w-0 py-3">
                  <dt className="font-bold text-neutral-900 dark:text-neutral-100">Primary color</dt>
                  <dd className="mt-1 capitalize text-neutral-500 dark:text-neutral-400">
                    {item.color}
                  </dd>
                </div>
              )}
              <div className="min-w-0 py-3">
                <dt className="font-bold text-neutral-900 dark:text-neutral-100">Specific location</dt>
                <dd className="mt-1 break-words text-neutral-500 dark:text-neutral-400">
                  {item.location}
                </dd>
              </div>
              <div className="min-w-0 py-3">
                <dt className="font-bold text-neutral-900 dark:text-neutral-100">Building</dt>
                <dd className="mt-1 break-words text-neutral-500 dark:text-neutral-400">
                  {item.building?.trim() || "Not provided"}
                </dd>
              </div>
              <div className="min-w-0 py-3">
                <dt className="font-bold text-neutral-900 dark:text-neutral-100">
                  {isLost ? "Date lost" : "Date found"}
                </dt>
                <dd className="mt-1 text-neutral-500 dark:text-neutral-400">
                  {itemDate ?? "Not provided"}
                </dd>
              </div>
              <div className="min-w-0 py-3">
                <dt className="font-bold text-neutral-900 dark:text-neutral-100">
                  {isLost ? "Time lost" : "Time found"}
                </dt>
                <dd className="mt-1 text-neutral-500 dark:text-neutral-400">
                  {itemTime ?? "Not provided"}
                </dd>
              </div>
              <div className="min-w-0 py-3">
                <dt className="font-bold text-neutral-900 dark:text-neutral-100">Category</dt>
                <dd className="mt-1 text-neutral-500 dark:text-neutral-400">
                  {formatCategoryLabel(item.category, item.customCategory)}
                </dd>
              </div>
              {isOwnItem && item.confidentialInfo?.trim() && (
                <div className="min-w-0 py-3">
                  <dt className="font-bold text-neutral-900 dark:text-neutral-100">
                    Important details
                  </dt>
                  <dd className="mt-1 break-words text-neutral-500 dark:text-neutral-400">
                    {item.confidentialInfo}
                  </dd>
                </div>
              )}
            </dl>

          </article>
          </FadeIn>
          </div>

          {/* Possible matches: found reports the system suggests for your lost item */}
          {serverItem && isOwnItem && isLost && suggestedMatches.length > 0 && (
            <FadeIn key={`matches-${item.id}`} delay={0.1}>
              <section aria-labelledby="suggested-matches-heading">
                <h2
                  id="suggested-matches-heading"
                  className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 text-balance"
                >
                  Possible matches
                </h2>
                <StaggerGrid
                  key={`matches-grid-${item.id}`}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                >
                  {suggestedMatches.map((suggested) => (
                    <StaggerItem key={suggested.id}>
                      <ItemCard
                        item={suggested}
                        onItemClick={(selected) =>
                          navigate(`/dashboard/items/${selected.id}`)
                        }
                      />
                    </StaggerItem>
                  ))}
                </StaggerGrid>
              </section>
            </FadeIn>
          )}

          {/* Related posts: same category and same lost/found type */}
          {relatedItems.length > 0 && (
            <FadeIn key={`related-${item.id}`} delay={0.12}>
              <section aria-labelledby="related-heading">
                <h2
                  id="related-heading"
                  className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 text-balance"
                >
                  Related {isLost ? "lost" : "found"}{" "}
                  {formatCategoryLabel(item.category).toLowerCase()} reports
                </h2>
                <StaggerGrid
                  key={`related-grid-${item.id}`}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                >
                  {relatedItems.map((related) => (
                    <StaggerItem key={related.id}>
                      <ItemCard
                        item={related}
                        onItemClick={(selected) =>
                          navigate(`/dashboard/items/${selected.id}`)
                        }
                      />
                    </StaggerItem>
                  ))}
                </StaggerGrid>
              </section>
            </FadeIn>
          )}

          {/* People holding this item (own lost reports only) */}
          {isOwnItem && isLost && finderReports.length > 0 && (
            <FadeIn key={`responses-${item.id}`} delay={0.14}>
              <section aria-labelledby="finder-reports-heading">
              <h2
                id="finder-reports-heading"
                className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 text-balance"
              >
                Responses to Your Lost Items ({finderReports.length})
              </h2>
              <ul className="mt-4 space-y-3">
                  {finderReports.map((claim) => {
                    const claimStatus = claim.status;

                    return (
                      <li
                        key={claim.id}
                        className="rounded-2xl bg-white dark:bg-neutral-900 p-4 sm:p-5"
                      >
                      <div className="grid items-stretch gap-8 md:grid-cols-2">
                        <div className="min-w-0">
                          {claim.evidence && claim.evidence.length > 0 ? (
                            <ClaimEvidenceGallery
                              images={claim.evidence}
                              altPrefix="Found item photo evidence"
                            />
                          ) : (
                            <NoItemImage
                              title="No photo evidence provided"
                              className="h-full min-h-48 w-full"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="min-w-0 truncate text-sm font-bold text-neutral-800 dark:text-neutral-200">
                              {claim.claimantTitle || "Found item report"}
                            </h3>
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${finderStatusStyles[claimStatus] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}
                            >
                              {claimStatus}
                            </span>
                          </div>
                          <div className="mt-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                              Description
                            </span>
                            <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 break-words">
                              {claim.details || "No additional description provided."}
                            </p>
                          </div>
                          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            {claim.color && (
                              <div>
                                <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                  Primary color
                                </dt>
                                <dd className="mt-1 font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                                  {claim.color}
                                </dd>
                              </div>
                            )}
                            <div>
                              <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                Location found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                {claim.location || "None"}
                              </dd>
                            </div>
                            {claim.building && (
                              <div>
                                <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                  Building
                                </dt>
                                <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                  {claim.building}
                                </dd>
                              </div>
                            )}
                            <div>
                              <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                Date found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                {claim.dateLost}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                Time found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                {claim.timeLost || "None"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                Submitted
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800 dark:text-neutral-200">
                                {claim.submitted}
                              </dd>
                            </div>
                          </dl>
                          {claimStatus === "Approved" && (
                            <div className="mt-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
                              <p className="font-bold flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {claim.approvalInstructions?.trim()
                                  ? "Pickup Instructions from OSA"
                                  : "Returned to OSA office"}
                              </p>
                              <p className="mt-1 whitespace-pre-line break-words leading-relaxed text-emerald-950 dark:text-emerald-100">
                                {claim.approvalInstructions?.trim() ||
                                  "Visit OSA with your school ID to claim."}
                              </p>
                            </div>
                          )}
                          {claimStatus === "Returned" && (
                            <div className="mt-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 p-3 text-xs text-teal-900 dark:text-teal-300">
                              <p className="font-bold">Item returned</p>
                            </div>
                          )}
                        </div>
                      </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </FadeIn>
          )}

        </main>
          </div>
        </div>
      </div>

      {item && foundItemCameraOpen && (
        <FoundItemCameraModal
          lostItemId={item.id}
          lostItemTitle={item.title}
          onClose={() => setFoundItemCameraOpen(false)}
        />
      )}
      {ownershipClaimOpen && (
        <OwnershipClaimModal
          itemId={item.id}
          itemTitle={item.title}
          claimant={user?.name ?? "Campus user"}
          onClose={() => setOwnershipClaimOpen(false)}
          onSubmitClaim={(claim) => onSubmitClaim?.(claim)}
        />
      )}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setDeleteDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-report-title"
            aria-describedby="delete-report-description"
            className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 p-6"
          >
            <h2
              id="delete-report-title"
              className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Delete this report?
            </h2>
            <p
              id="delete-report-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 break-words"
            >
              Are you sure you want to delete &ldquo;{item.title}&rdquo;? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-10 px-4 rounded-xl bg-[#E5192D] text-white text-xs font-bold transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}
      <ReportPostDialog
        itemId={item.id}
        itemTitle={item.title}
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </div>
  );
};

export default ItemDetailPage;

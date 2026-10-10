import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  Clock3,
  Lock,
  MapPin,
  Package,
  Palette,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/school_user/Sidebar";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import { FoundItemCameraModal } from "@/components/school_user/FoundItemCameraModal";
import { OwnershipClaimModal } from "@/components/school_user/OwnershipClaimModal";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { initialItems, type Item } from "@/data/mockItems";
import { NoItemImage } from "@/components/NoItemImage";
import { useAuth } from "@/context/useAuth";
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";
import { getClaimantEmail } from "@/types/claim";
import { claims as demoClaims } from "@/components/admin/adminData";

interface ItemDetailPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
  onSubmitClaim?: (claim: NewClaimRequest) => void;
}

const FALLBACK_PROFILE_NAME = "Vaughn Evangelista";

const finderStatusStyles: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  "Under review": "bg-blue-50 text-blue-800",
  Approved: "bg-emerald-50 text-emerald-700",
  Claimed: "bg-emerald-50 text-emerald-700",
  Returned: "bg-neutral-100 text-neutral-600",
  Rejected: "bg-neutral-100 text-neutral-500",
};

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem: propOnAddItem,
  onSubmitClaim,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const sidebarActiveTab =
    locationState?.from === "/dashboard/profile" ? "profile" : "home";
  const { user } = useAuth();
  const items = propItems ?? initialItems;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const item = useMemo(() => items.find((entry) => entry.id === id), [items, id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [foundItemCameraOpen, setFoundItemCameraOpen] = useState(false);
  const [ownershipClaimOpen, setOwnershipClaimOpen] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<
    "lost" | "found"
  >("lost");

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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Searching from the detail page jumps back to the feed with the
    // query applied, mirroring dashboard search behavior.
    navigate(query.trim() ? `/dashboard?q=${encodeURIComponent(query.trim())}` : "/dashboard", {
      replace: true,
    });
  };

  const handleOpenCreateModal = (type: "lost" | "found" = "lost") => {
    setCreateModalInitialType(type);
    setCreateModalOpen(true);
  };

  const handleAddItem = (newItem: Item) => {
    if (propOnAddItem) propOnAddItem(newItem);
    setCreateModalOpen(false);
    navigate("/dashboard");
  };

  const similarItems = useMemo(() => {
    if (!item) return [];
    return items
      .filter((entry) => entry.id !== item.id && entry.category === item.category)
      .slice(0, 4);
  }, [items, item]);

  const profileName = user?.name || FALLBACK_PROFILE_NAME;
  const isOwnItem = useMemo(() => {
    if (!item) return false;
    return (
      item.username?.toLowerCase() ===
        profileName.toLowerCase().replace(/\s+/g, "_") ||
      item.contactName.trim().toLowerCase() ===
        profileName.trim().toLowerCase()
    );
  }, [item, profileName]);

  const finderReports = useMemo(() => {
    if (!item) return [];
    return [...submittedClaims, ...demoClaims].filter(
      (claim) => claim.itemId === item.id,
    );
  }, [item, submittedClaims]);

  if (!item) {
    return (
      <div className="min-h-screen bg-white flex font-open-sans text-neutral-900">
        <Sidebar
          activeTab={sidebarActiveTab}
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          onNotificationsOpenChange={setNotificationsOpen}
          onTabChange={() => navigate("/dashboard")}
          onOpenCreateModal={() => handleOpenCreateModal("lost")}
          items={items}
          submittedClaims={submittedClaims}
        />
        <div className={`flex-1 min-w-0 ml-16 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarExpanded ? "md:ml-60" : "md:ml-20"}`}>
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchInputRef={searchInputRef}
            notificationsOpen={notificationsOpen}
          />
          <div
            className={`min-w-0 flex-1 transition-[margin,width] duration-300 ease-in-out ${
              notificationsOpen
                ? "md:ml-80 md:w-[calc(100%-20rem)]"
                : "w-full"
            }`}
          >
            <div className="flex h-full items-center justify-center px-8 py-16">
              <main className="max-w-sm text-center">
                <h1 className="text-lg font-extrabold text-neutral-900 text-balance">
                  Item not found
                </h1>
                <p className="mt-2 break-words text-sm text-neutral-500">
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  const username =
    item.username ||
    item.contactName?.toLowerCase().replace(/\s+/g, "_") ||
    "student_user";
  const avatarUrl = item.userAvatar || `/images/avatars/${username}.svg`;
  const isLost = item.type === "lost";
  const eventDate =
    item.dateTime && !Number.isNaN(new Date(item.dateTime).getTime())
      ? new Date(item.dateTime)
      : null;
  const itemDate = eventDate
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
        eventDate,
      )
    : null;
  const itemTime = eventDate
    ? new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(
        eventDate,
      )
    : null;
  const category = ITEM_CATEGORIES.find(({ id }) => id === item.category);
  const CategoryIcon = category?.icon ?? Package;

  const handleShare = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      toast.success("Item link copied to clipboard!");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <a
        href="#item-detail-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-20 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        Skip to item details
      </a>
      <Sidebar
        activeTab={sidebarActiveTab}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        onTabChange={() => navigate("/dashboard")}
        onOpenCreateModal={() => handleOpenCreateModal("lost")}
        items={items}
        submittedClaims={submittedClaims}
      />

      <div className={`flex-1 min-w-0 ml-16 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarExpanded ? "md:ml-60" : "md:ml-20"}`}>
        {/* Same search header as the dashboard */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchInputRef={searchInputRef}
          notificationsOpen={notificationsOpen}
        />

        <div
          className={`min-w-0 flex-1 transition-[margin,width] duration-300 ease-in-out ${
            notificationsOpen
              ? "md:ml-80 md:w-[calc(100%-20rem)]"
              : "w-full"
          }`}
        >
        {/* Detail actions row */}
        <div className="px-2 sm:px-3 lg:px-4 pt-4 flex items-center justify-between max-w-[1100px] mx-auto w-full">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copy link to this item"
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <main
          id="item-detail-main"
          className="min-w-0 w-full max-w-[1100px] mx-auto bg-white px-2 sm:px-3 lg:px-4 py-6 space-y-6"
        >
          {/* Hero: picture left, details right (no enclosing card) */}
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* Hero image — fixed frame so every item measures the same */}
          {item.image ? (
            <div className="aspect-[4/3] max-h-[560px] w-full overflow-hidden rounded-3xl bg-neutral-100 border border-neutral-200/80">
              <img
                src={item.image}
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

          {/* Details (not in a card) */}
          <article className="min-w-0">
            {/* Reporter profile on top */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100 border border-neutral-200">
                <img
                  src={avatarUrl}
                  alt=""
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://api.dicebear.com/7.x/adventurer/svg?seed=foundit";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-neutral-900">
                  {item.contactName}
                </p>
                <p className="truncate text-xs text-neutral-400">
                  {item.timeAgo}
                </p>
              </div>
              {!isOwnItem && (
                <button
                  type="button"
                  onClick={() => {
                    if (isLost) {
                      setFoundItemCameraOpen(true);
                      return;
                    }
                    setOwnershipClaimOpen(true);
                  }}
                  className="shrink-0 h-10 px-5 rounded-full bg-[#E5192D] text-white text-xs font-bold transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
                >
                  {isLost ? "I Found This" : "This Is Mine"}
                </button>
              )}
            </div>

            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">
              {isLost ? "Lost item report" : "Found item report"}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 text-balance break-words">
              {item.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 break-words">
              {item.description}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-x-6 border-y border-neutral-200/80 text-xs sm:grid-cols-2">
              {item.color && (
                <div className="flex items-start gap-2.5 py-3">
                  <Palette
                    className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="font-bold text-neutral-900">Color</dt>
                    <dd className="mt-1 capitalize text-neutral-500">
                      {item.color}
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5 py-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">Specific location</dt>
                  <dd className="mt-1 break-words text-neutral-500">
                    {item.location}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-3">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">Building</dt>
                  <dd className="mt-1 break-words text-neutral-500">
                    {item.building?.trim() || "Not provided"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-3">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    {isLost ? "Date lost" : "Date found"}
                  </dt>
                  <dd className="mt-1 text-neutral-500">
                    {itemDate ?? "Not provided"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-3">
                <Clock3
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    {isLost ? "Time lost" : "Time found"}
                  </dt>
                  <dd className="mt-1 text-neutral-500">
                    {itemTime ?? "Not provided"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-3">
                <CategoryIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">Category</dt>
                  <dd className="mt-1 text-neutral-500">
                    {category?.label ?? "Other"}
                  </dd>
                </div>
              </div>
              {isOwnItem && item.confidentialInfo?.trim() && (
                <div className="flex items-start gap-2.5 py-3">
                  <Lock
                    className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="font-bold text-neutral-900">
                      Confidential info
                    </dt>
                    <dd className="mt-1 break-words text-neutral-500">
                      {item.confidentialInfo}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            {item.reward && (
              <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200/70">
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                Reward: {item.reward}
              </p>
            )}

          </article>
          </div>

          {/* People holding this item (own lost reports only) */}
          {isOwnItem && isLost && (
            <section aria-labelledby="finder-reports-heading">
              <h2
                id="finder-reports-heading"
                className="text-sm font-extrabold text-neutral-900 text-balance"
              >
                Responses to Your Lost Items ({finderReports.length})
              </h2>
              {finderReports.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {finderReports.map((claim) => (
                    <li
                      key={claim.id}
                      className="rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5"
                    >
                      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <div className="min-w-0">
                          {claim.evidence && claim.evidence.length > 0 ? (
                            <div
                              className={`grid gap-2 ${
                                claim.evidence.length > 1
                                  ? "grid-cols-2"
                                  : "grid-cols-1"
                              }`}
                            >
                              {claim.evidence.map((image, index) => (
                                <div
                                  key={`${claim.id}-evidence-${index}`}
                                  className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50"
                                >
                                  <img
                                    src={image}
                                    alt={`Photo evidence ${index + 1} from ${claim.claimant}`}
                                    loading="lazy"
                                    className="h-full max-w-full object-contain"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <NoItemImage
                              title="No photo evidence provided"
                              subtitle="The finder did not attach any photos."
                              className="h-48"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-neutral-800">
                              {claim.claimant}
                            </p>
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${finderStatusStyles[claim.status] ?? "bg-neutral-100 text-neutral-600"}`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {getClaimantEmail(claim)}
                          </p>
                          <div className="mt-3 border-b border-neutral-100 pb-3">
                            <p className="text-xs leading-relaxed text-neutral-700 break-words">
                              {claim.details}
                            </p>
                          </div>
                          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <div>
                              <dt className="text-[10px] text-neutral-400">
                                Submitted
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800">
                                {claim.submitted}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] text-neutral-400">
                                Date found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800">
                                {claim.dateLost}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] text-neutral-400">
                                Time found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800">
                                {claim.timeLost}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] text-neutral-400">
                                Location found
                              </dt>
                              <dd className="mt-1 font-semibold text-neutral-800">
                                {claim.location}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                  No one has submitted a found report for this item yet. New
                  submissions from people holding it will appear here.
                </p>
              )}
            </section>
          )}

          {/* Similar items (hidden on your own reports) */}
          {!isOwnItem && similarItems.length > 0 && (
            <section aria-labelledby="similar-heading">
              <h2
                id="similar-heading"
                className="text-sm font-extrabold text-neutral-900 text-balance"
              >
                Similar {category?.label.toLowerCase() ?? "item"} reports
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {similarItems.map((similar) => (
                  <ItemCard
                    key={similar.id}
                    item={similar}
                    onItemClick={(selected) =>
                      navigate(`/dashboard/items/${selected.id}`)
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </main>
        </div>
      </div>

      {/* Create / Report Item Modal (same as dashboard) */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
        initialType={createModalInitialType}
      />
      {foundItemCameraOpen && (
        <FoundItemCameraModal onClose={() => setFoundItemCameraOpen(false)} />
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
    </div>
  );
};

export default ItemDetailPage;

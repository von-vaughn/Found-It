import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  MapPin,
  Palette,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/school_user/Sidebar";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import { initialItems, type Item } from "@/data/mockItems";
import { formatItemDateTime } from "@/lib/dateTime";

interface ItemDetailPageProps {
  items?: Item[];
  onAddItem?: (newItem: Item) => void;
}

function formatReportDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  items: propItems,
  onAddItem: propOnAddItem,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const items = propItems ?? initialItems;

  const item = useMemo(() => items.find((entry) => entry.id === id), [items, id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

  if (!item) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex font-sans text-neutral-900">
        <Sidebar
          activeTab="home"
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          onTabChange={() => navigate("/dashboard")}
          onOpenCreateModal={() => handleOpenCreateModal("lost")}
        />
        <div className={`flex-1 min-w-0 ml-16 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarExpanded ? "md:ml-60" : "md:ml-20"}`}>
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onOpenReportModal={() => handleOpenCreateModal("lost")}
            searchInputRef={searchInputRef}
          />
          <div className="flex-1 flex items-center justify-center px-8 py-16">
            <main className="text-center max-w-sm">
            <h1 className="text-lg font-extrabold text-neutral-900 text-balance">
              Item not found
            </h1>
            <p className="mt-2 text-sm text-neutral-500 break-words">
              The item you are looking for may have been removed or the link is
              incorrect.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to feed
            </Link>
            </main>
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
  const itemDateTime = item.dateTime
    ? formatItemDateTime(item.dateTime)
    : null;

  const handleShare = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      toast.success("Item link copied to clipboard!");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <a
        href="#item-detail-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-20 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        Skip to item details
      </a>
      <Sidebar
        activeTab="home"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onTabChange={() => navigate("/dashboard")}
        onOpenCreateModal={() => handleOpenCreateModal("lost")}
      />

      <div className={`flex-1 min-w-0 ml-16 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarExpanded ? "md:ml-60" : "md:ml-20"}`}>
        {/* Same search header as the dashboard */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onOpenReportModal={() => handleOpenCreateModal("lost")}
          searchInputRef={searchInputRef}
        />

        {/* Detail actions row */}
        <div className="px-2 sm:px-3 lg:px-4 pt-4 flex items-center justify-between max-w-[1100px] mx-auto w-full">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to feed
          </Link>
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
          className="flex-1 min-w-0 w-full max-w-[1100px] mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-6"
        >
          {/* Hero: picture left, details right (no enclosing card) */}
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* Hero image */}
          {item.image ? (
            <div className="overflow-hidden rounded-3xl bg-neutral-100 border border-neutral-200/80">
              <img
                src={item.image}
                alt={item.title}
                width={1200}
                height={900}
                fetchPriority="high"
                className="w-full max-h-[560px] object-cover"
              />
            </div>
          ) : (
            <div className="rounded-3xl bg-neutral-100 border border-dashed border-neutral-200 p-10 text-center text-xs font-medium text-neutral-400">
              No image attached to this report.
            </div>
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
                  @{username}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(`Message sent to ${item.contactName}!`)
                }
                className="shrink-0 h-10 px-5 rounded-full bg-[#E5192D] text-white text-xs font-bold transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
              >
                {isLost ? "I Found This" : "This Is Mine"}
              </button>
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

            {item.reward && (
              <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200/70">
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                Reward: {item.reward}
              </p>
            )}

            <dl className="mt-6 divide-y divide-neutral-200/80 border-y border-neutral-200/80 text-xs">
              <div className="flex items-center gap-2.5 py-3 min-w-0">
                <MapPin
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex flex-1 items-baseline justify-between gap-4">
                  <dt className="shrink-0 font-bold text-neutral-900">Location</dt>
                  <dd className="min-w-0 truncate text-neutral-500">
                    {item.location}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2.5 py-3 min-w-0">
                <Calendar
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex flex-1 items-baseline justify-between gap-4">
                  <dt className="shrink-0 font-bold text-neutral-900">Reported</dt>
                  <dd className="min-w-0 truncate text-neutral-500">
                    {formatReportDate(item.date)} · {item.timeAgo}
                  </dd>
                </div>
              </div>
              {isLost && (
                <div className="flex items-center gap-2.5 py-3 min-w-0">
                  <Clock
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex flex-1 items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-bold text-neutral-900">
                      Date and time lost
                    </dt>
                    <dd className="min-w-0 truncate text-neutral-500">
                      {itemDateTime ?? "Not provided"}
                    </dd>
                  </div>
                </div>
              )}
              {item.color && (
                <div className="flex items-center gap-2.5 py-3 min-w-0">
                  <Palette
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex flex-1 items-baseline justify-between gap-4">
                    <dt className="shrink-0 font-bold text-neutral-900">Color</dt>
                    <dd className="min-w-0 truncate capitalize text-neutral-500">
                      {item.color}
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 py-3 min-w-0">
                <Clock
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex flex-1 items-baseline justify-between gap-4">
                  <dt className="shrink-0 font-bold text-neutral-900">Status</dt>
                  <dd className="min-w-0 truncate capitalize text-neutral-500">
                    {item.status}
                  </dd>
                </div>
              </div>
            </dl>

          </article>
          </div>

          {/* Similar items */}
          {similarItems.length > 0 && (
            <section aria-labelledby="similar-heading">
              <h2
                id="similar-heading"
                className="text-sm font-extrabold text-neutral-900 text-balance"
              >
                Similar {item.category} reports
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

      {/* Create / Report Item Modal (same as dashboard) */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
        initialType={createModalInitialType}
      />
    </div>
  );
};

export default ItemDetailPage;

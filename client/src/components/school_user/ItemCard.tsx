import React, { useState } from "react";
import { MoreHorizontal, Award, Package } from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import type { Item } from "@/data/mockItems";
import toast from "react-hot-toast";

interface ItemCardProps {
  item: Item;
  onItemClick?: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onItemClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.href);
    toast.success(`Copied link to "${item.title}"`, {
      icon: "🔗",
      id: `share-${item.id}`,
    });
  };

  const username = item.username || item.contactName?.toLowerCase().replace(/\s+/g, "_") || "student_user";
  const avatarUrl =
    item.userAvatar ||
    `/images/avatars/${username}.svg`;

  const isLost = item.type === "lost";
  const category = ITEM_CATEGORIES.find(({ id }) => id === item.category);
  const CategoryIcon = category?.icon ?? Package;

  const titleBlock = (
    <>
      <h3 className="text-base font-bold text-neutral-900 line-clamp-1 group-hover:text-neutral-950 transition-colors">
        {item.title}
      </h3>
      {!item.image && item.reward && (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
          <Award className="h-3 w-3" aria-hidden="true" />
          {item.reward}
        </span>
      )}
    </>
  );

  const footerRow = (
    <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
        <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
        <span className="truncate">{category?.label ?? "Other"}</span>
      </div>

      <span className="text-xs font-semibold text-neutral-900">
        {isLost ? "I Found This" : "This Is Mine"}
      </span>
    </div>
  );

  return (
    <div
      onClick={() => onItemClick && onItemClick(item)}
      className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col group cursor-pointer relative"
    >
      {/* Top Author Row — kept in same position */}
      <div className="flex items-center justify-between gap-3 p-4 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
            <img
              src={avatarUrl}
              alt={username}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://api.dicebear.com/7.x/adventurer/svg?seed=ken_21";
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-neutral-900 truncate hover:text-[#E5192D] transition-colors leading-tight">
              {username}
            </div>
            <div className="text-[11px] text-neutral-400 font-normal truncate mt-0.5">
              {item.timeAgo}
            </div>
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-neutral-100 py-1.5 z-20 text-xs font-medium text-neutral-700 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onItemClick && onItemClick(item);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={(e) => {
                  setMenuOpen(false);
                  handleShare(e);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 transition-colors"
              >
                Share Link
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  toast.success("Post reported to admin");
                }}
                className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                Report Post
              </button>
            </div>
          )}
        </div>
      </div>

      {item.image ? (
        <>
          {/* Photo block */}
          <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden mx-3 rounded-lg">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

            {/* Reward badge top-left */}
            {item.reward && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {item.reward}
                </span>
              </div>
            )}
          </div>

          {/* Text content below photo */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              {titleBlock}
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed break-words line-clamp-2">
                {item.description}
              </p>
            </div>

            {footerRow}
          </div>
        </>
      ) : (
        <>
          {/* Item name above the description */}
          <div className="px-4">{titleBlock}</div>

          {/* Description block — same box size as a photo, so every
              card keeps the same height. */}
          <div className="aspect-[4/3] mx-3 mt-3 overflow-hidden rounded-xl">
            <div className="h-full overflow-y-auto px-2">
              <p className="text-xs text-neutral-500 leading-relaxed break-words">
                {item.description}
              </p>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Spacer standing in for the 2-line description block
                  minus the mt-3 gap above (45px - 12px), so imageless
                  cards measure exactly like photo cards. */}
              <div aria-hidden="true" className="h-[33px]" />
            </div>

            {footerRow}
          </div>
        </>
      )}
    </div>
  );
};

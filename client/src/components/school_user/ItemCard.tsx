import React, { useState } from "react";
import { MoreHorizontal, MapPin, Clock, Award } from "lucide-react";
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

  return (
    <div
      onClick={() => onItemClick && onItemClick(item)}
      className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col group cursor-pointer relative"
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

      {/* Image with overlay badges — matching landing page format */}
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden mx-3 rounded-xl">
        {item.image && (
          <>
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

            {/* Time badge bottom-left */}
            <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow-md">
              <Clock className="w-3.5 h-3.5 text-white/90" />
              <span>{item.timeAgo}</span>
            </div>
          </>
        )}
      </div>

      {/* Text content below image — matching landing page format */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-neutral-900 line-clamp-1 group-hover:text-neutral-950 transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 max-w-[170px] truncate">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>

          <span className={`text-xs font-semibold ${isLost ? "text-[#E5192D]" : "text-emerald-700"}`}>
            {isLost ? "I Found This →" : "This Is Mine →"}
          </span>
        </div>
      </div>
    </div>
  );
};

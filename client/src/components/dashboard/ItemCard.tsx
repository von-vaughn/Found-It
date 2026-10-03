import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
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

  return (
    <div
      onClick={() => onItemClick && onItemClick(item)}
      className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col group cursor-pointer relative"
    >
      {/* Top Author Row */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
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
                {item.timeAgo} • {item.type === "lost" ? "Lost Item" : "Found Item"}
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

        {/* Item Title */}
        <h3 className="font-bold text-[15px] text-neutral-900 group-hover:text-neutral-950 transition-colors mb-1 line-clamp-1">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-neutral-500 font-normal leading-relaxed mb-3 line-clamp-3">
          {item.description}
        </p>

        {/* Media Box */}
        {item.image && (
          <div className="w-full rounded-xl overflow-hidden bg-neutral-100 border border-neutral-100 mb-3 relative">
            <img
              src={item.image}
              alt={item.title}
              className="block w-full h-auto group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}
      </div>

    </div>
  );
};

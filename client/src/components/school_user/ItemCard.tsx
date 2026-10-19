import React, { useState } from "react";
import { MoreHorizontal, Award, Package } from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import type { Item } from "@/data/mockItems";
import { NoItemImage } from "@/components/NoItemImage";
import { useAuth } from "@/context/useAuth";
import { useDeleteItem } from "@/hooks/useItems";
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
  const { user } = useAuth();
  const deleteMutation = useDeleteItem();
  const isOwnPost = Boolean(item.reporterId && item.reporterId === user?.id);

  const handleDelete = () => {
    setMenuOpen(false);
    if (!window.confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate(item.id, {
      onSuccess: () => toast.success("Your report was deleted."),
      onError: (err) => {
        console.error("Failed to delete item:", err);
        toast.error("Failed to delete item.");
      },
    });
  };

  const isLost = item.type === "lost";
  const category = ITEM_CATEGORIES.find(({ id }) => id === item.category);
  const CategoryIcon = category?.icon ?? Package;

  const footerRow = (
    <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
        <span className="truncate">{category?.label ?? "Other"}</span>
      </div>

      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
        {isLost ? "I Found This" : "This Is Mine"}
      </span>
    </div>
  );

  const menuDropdown = menuOpen && (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-800 py-1.5 z-20 text-xs font-medium text-neutral-700 dark:text-neutral-300 animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => {
          setMenuOpen(false);
          onItemClick?.(item);
        }}
        className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        View Details
      </button>
      {isOwnPost ? (
        <button
          onClick={handleDelete}
          className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          Delete Post
        </button>
      ) : (
        <button
          onClick={() => {
            setMenuOpen(false);
            toast.success("Post reported to admin");
          }}
          className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          Report Post
        </button>
      )}
    </div>
  );

  const headerRow = (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate hover:text-[#E5192D] transition-colors leading-tight">
            {item.title}
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal truncate mt-0.5">
            {isLost ? "Lost" : "Found"} • {item.timeAgo}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      onClick={() => onItemClick && onItemClick(item)}
      className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col group cursor-pointer relative"
    >
      {/* Media block on top — full-bleed for both photos and the placeholder */}
      <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {item.image ? (
          <>
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </>
        ) : (
          <NoItemImage
            className="h-full w-full rounded-none border-0 bg-neutral-200/70 dark:bg-neutral-800"
          />
        )}

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

      {/* More Menu — top right of the media */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            item.image
              ? "text-white hover:text-white/80 drop-shadow-md"
              : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
          }`}
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuDropdown}
      </div>

      {/* Item title + Lost/Found + time below media */}
      {headerRow}

      {/* Text content below title */}
      <div className="px-4 pb-4 flex-1 flex flex-col justify-between">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed break-words line-clamp-2">
          {item.description}
        </p>

        {footerRow}
      </div>
    </div>
  );
};

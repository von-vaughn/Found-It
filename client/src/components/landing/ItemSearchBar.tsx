import React from "react";
import { Search, X } from "lucide-react";

export type ItemSearchType = "lost" | "found";

interface ItemSearchBarProps {
  searchQuery: string;
  searchType: ItemSearchType;
  theme?: "dark" | "light";
  showTypeToggle?: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearchTypeChange: (type: ItemSearchType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const ItemSearchBar: React.FC<ItemSearchBarProps> = ({
  searchQuery,
  searchType,
  theme = "dark",
  showTypeToggle = true,
  onSearchQueryChange,
  onSearchTypeChange,
  onSubmit,
}) => {
  const isLight = theme === "light";

  return (
    <form
      onSubmit={onSubmit}
      className={`w-full p-1 rounded-3xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 transition-all focus-within:border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20 ${
        isLight
          ? "bg-white shadow-xs border-neutral-200"
          : "bg-neutral-900/90 shadow-2xl shadow-black/80 border-white/15 backdrop-blur-xl"
      }`}
    >
      {showTypeToggle && (
        <div
          className={`flex items-center p-1 rounded-2xl shrink-0 self-center sm:self-auto border ${
            isLight
              ? "bg-neutral-100 border-neutral-200"
              : "bg-neutral-800/90 border-neutral-700/50"
          }`}
        >
          <button
            type="button"
            onClick={() => onSearchTypeChange("lost")}
            aria-pressed={searchType === "lost"}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              searchType === "lost"
                ? "bg-[#E5192D] text-white shadow-md shadow-red-500/30"
                : isLight
                  ? "text-neutral-500 hover:text-neutral-900"
                  : "text-neutral-400 hover:text-white"
            }`}
          >
            Lost
          </button>
          <button
            type="button"
            onClick={() => onSearchTypeChange("found")}
            aria-pressed={searchType === "found"}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              searchType === "found"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                : isLight
                  ? "text-neutral-500 hover:text-neutral-900"
                  : "text-neutral-400 hover:text-white"
            }`}
          >
            Found
          </button>
        </div>
      )}

      <div className="relative flex-1 flex items-center min-w-0 px-2">
        <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search lost or found items"
          aria-label="Search lost or found items"
          className={`w-full h-7 text-sm sm:text-base bg-transparent focus:outline-none ${
            isLight
              ? "text-neutral-900 placeholder-neutral-400"
              : "text-white placeholder-neutral-500"
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            aria-label="Clear search"
            className={`p-1 rounded-full transition-colors shrink-0 cursor-pointer ${
              isLight
                ? "text-neutral-400 hover:text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  );
};

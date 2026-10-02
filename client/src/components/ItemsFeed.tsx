import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/data/mockItems";

interface ItemsFeedProps {
  items: Item[];
  onBrowseItems: (type: "lost" | "found") => void;
  feedType: "all" | "lost" | "found";
  setFeedType: (type: "all" | "lost" | "found") => void;
}

export const ItemsFeed: React.FC<ItemsFeedProps> = ({
  items,
  onBrowseItems,
  feedType,
  setFeedType,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", label: "All Items" },
    { id: "bags", label: "🎒 Bags" },
    { id: "electronics", label: "📱 Electronics" },
    { id: "keys", label: "🔑 Keys" },
    { id: "wallets", label: "👛 Wallets" },
    { id: "accessories", label: "👓 Accessories" },
  ];

  const filteredItems = items.filter((item) => {
    const matchesType = feedType === "all" ? true : item.type === feedType;
    const matchesCategory =
      selectedCategory === "all" ? true : item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      item.title.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);

    return matchesType && matchesCategory && matchesQuery;
  });

  return (
    <section id="items" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E5192D]">
                Community Radar
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Recent Lost & Found
            </h2>
            <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-xl">
              Browse recently reported belongings in your area and filter by
              type, category, or location.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => onBrowseItems("lost")}
              className="rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold text-sm px-5 py-2.5 shadow-sm"
            >
              I Lost Something
            </Button>
            <Button
              variant="outline"
              onClick={() => onBrowseItems("found")}
              className="rounded-full border-neutral-300 font-semibold text-sm px-5 py-2.5 hover:bg-neutral-50"
            >
              I Found Something
            </Button>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-neutral-50 rounded-2xl border border-neutral-200/70">
            <div className="flex items-center p-1 bg-white rounded-xl shadow-xs border border-neutral-200/60">
              <button
                onClick={() => setFeedType("all")}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  feedType === "all"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setFeedType("lost")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  feedType === "lost"
                    ? "bg-[#E5192D] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${feedType === "lost" ? "bg-white" : "bg-[#E5192D]"}`}
                />
                Lost Items
              </button>
              <button
                onClick={() => setFeedType("found")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  feedType === "found"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${feedType === "found" ? "bg-white" : "bg-emerald-600"}`}
                />
                Found Items
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords, location, brand..."
                className="w-full h-10 pl-9 pr-4 text-sm bg-white rounded-xl border border-neutral-200/80 focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] text-neutral-800 placeholder-neutral-400 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence initial={false}>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.18,
                  ease: "easeOut",
                  delay: index * 0.015,
                }}
                className="group bg-white rounded-2xl border border-neutral-200/80 hover:border-neutral-300 overflow-hidden shadow-xs hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {item.type === "lost" ? (
                      <span className="bg-[#E5192D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LOST
                      </span>
                    ) : (
                      <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        FOUND
                      </span>
                    )}

                    {item.reward && (
                      <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-0.5">
                        <Award className="w-3 h-3" />
                        {item.reward}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow-md">
                    <Clock className="w-3.5 h-3.5 text-white/90" />
                    <span>{item.timeAgo}</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-[#E5192D] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 max-w-[170px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4 bg-neutral-50 rounded-3xl border border-dashed border-neutral-200 mt-6">
            <div className="w-14 h-14 bg-red-100/60 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E5192D]">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              No matching items found
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              We couldn't find any items matching &ldquo;{searchQuery}&rdquo;.
              Try a different search or check back soon.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => onBrowseItems("lost")}
                className="rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold text-xs px-5"
              >
                Report Missing Item
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setFeedType("all");
                }}
                className="rounded-full text-xs"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

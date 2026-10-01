import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Clock, Award, PlusCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import { ItemModal } from "@/components/ItemModal";
import { ReportModal } from "@/components/ReportModal";

interface LostItemsPageProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
}

export const LostItemsPage: React.FC<LostItemsPageProps> = ({ items, onAddItem }) => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // ONLY LOST ITEMS
  const lostItems = items.filter((item) => item.type === "lost");

  const categories = [
    { id: "all", label: "All Items" },
    { id: "bags", label: "🎒 Bags" },
    { id: "electronics", label: "📱 Electronics" },
    { id: "keys", label: "🔑 Keys" },
    { id: "wallets", label: "👛 Wallets" },
    { id: "accessories", label: "👓 Accessories" },
  ];

  // Filtering
  const filteredItems = lostItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ? true : item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      item.title.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-6">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <span>/</span>
          <span className="text-[#E5192D]">Lost Items</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-neutral-200/80">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E5192D]">
                Community Lost Directory
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight">
              Lost Items
            </h1>
            <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Browse belongings recently reported missing by students and community members.
              Have you spotted any of these? Contact the owner to help reunite them!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsReportModalOpen(true)}
              className="h-11 px-6 rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold text-sm shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Report a Lost Item
            </Button>
          </div>
        </div>

        {/* Filter Controls: Search & Categories */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lost items by name, location, brand, or details..."
                className="w-full h-11 pl-10 pr-4 text-sm bg-neutral-50/70 rounded-xl border border-neutral-200/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] text-neutral-800 placeholder-neutral-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Total Count Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl text-xs font-bold text-[#E5192D] border border-red-100 shrink-0 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#E5192D]" />
              <span>{filteredItems.length} {filteredItems.length === 1 ? "Item" : "Items"} Reported Lost</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20"
                    : "bg-white text-neutral-600 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lost Item Cards Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                onClick={() => setSelectedItem(item)}
                className="group bg-white rounded-2xl border border-neutral-200/80 hover:border-red-300/80 overflow-hidden shadow-xs hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Image container */}
                <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Badge: LOST */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="bg-[#E5192D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LOST
                    </span>

                    {item.reward && (
                      <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {item.reward}
                      </span>
                    )}
                  </div>

                  {/* Date badge */}
                  <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow-md">
                    <Clock className="w-3.5 h-3.5 text-white/90" />
                    <span>{item.timeAgo}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-[#E5192D] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 max-w-[170px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>

                    <span className="text-xs font-semibold text-[#E5192D] group-hover:underline">
                      I Found This &rarr;
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-neutral-200 mt-6 shadow-xs">
            <div className="w-14 h-14 bg-red-100/60 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E5192D]">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              No lost items match your search
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              We couldn't find any lost items matching &ldquo;{searchQuery}&rdquo;.
              Try clearing your filters or report a new lost item.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => setIsReportModalOpen(true)}
                className="rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold text-xs px-5 shadow-sm"
              >
                Report Lost Item
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="rounded-full text-xs"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      <ItemModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType="lost"
        onAddItem={onAddItem}
      />
    </div>
  );
};

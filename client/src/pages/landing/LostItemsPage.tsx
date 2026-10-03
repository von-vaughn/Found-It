import React, { useState } from "react";
import {
  Search,
  MapPin,
  Clock,
  Award,
  PlusCircle,
  BriefcaseBusiness,
  Smartphone,
  KeyRound,
  WalletCards,
  Glasses,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ItemSearchBar,
  type ItemSearchType,
} from "@/components/landing/ItemSearchBar";
import type { Item } from "@/data/mockItems";
import { ItemModal } from "@/components/ItemModal";
import { ReportModal } from "@/components/ReportModal";

interface LostItemsPageProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
}

export const LostItemsPage: React.FC<LostItemsPageProps> = ({
  items,
  onAddItem,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const searchQuery = searchParams.get("q") || "";
  const [searchType, setSearchType] = useState<ItemSearchType>("lost");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleSearchQueryChange = (query: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (query) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetPath = searchType === "found" ? "/found-items" : "/lost-items";
    const query = searchQuery.trim();
    navigate(
      query ? `${targetPath}?q=${encodeURIComponent(query)}` : targetPath,
    );
  };

  const lostItems = items.filter((item) => item.type === "lost");

  const categories = [
    { id: "all", label: "All Items" },
    { id: "bags", label: "Bags", icon: BriefcaseBusiness },
    { id: "electronics", label: "Electronics", icon: Smartphone },
    { id: "keys", label: "Keys", icon: KeyRound },
    { id: "wallets", label: "Wallets", icon: WalletCards },
    { id: "accessories", label: "Accessories", icon: Glasses },
  ];

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight">
              Lost Items
            </h1>
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

        <div className="space-y-4 mb-8 w-full">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme="light"
            showTypeToggle={false}
            onSearchQueryChange={handleSearchQueryChange}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20"
                      : "bg-white text-neutral-600 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs flex flex-col cursor-pointer"
            >
              <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

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

                <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow-md">
                  <Clock className="w-3.5 h-3.5 text-white/90" />
                  <span>{item.timeAgo}</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 line-clamp-1">
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

                  <span className="text-xs font-semibold text-[#E5192D]">
                    I Found This &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-neutral-200 mt-6 shadow-xs">
            <div className="w-14 h-14 bg-red-100/60 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E5192D]">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800">
              No lost items match your search
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              We couldn't find any lost items matching &ldquo;{searchQuery}
              &rdquo;. Try clearing your filters or report a new lost item.
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
                  handleSearchQueryChange("");
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

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType="lost"
        onAddItem={onAddItem}
      />
    </div>
  );
};

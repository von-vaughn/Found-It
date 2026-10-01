import React, { useState } from "react";
import { MapPin, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemModal } from "@/components/ItemModal";
import { ReportModal } from "@/components/ReportModal";
import type { Item } from "@/data/mockItems";

interface FoundItemsPageProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
}

export const FoundItemsPage: React.FC<FoundItemsPageProps> = ({
  items,
  onAddItem,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const query = searchQuery.toLowerCase().trim();
  const foundItems = items.filter(
    (item) =>
      item.type === "found" &&
      [item.title, item.location, item.description].some((value) =>
        value.toLowerCase().includes(query),
      ),
  );

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-8 border-b border-neutral-200/80">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              Community Found Directory
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900">
              Found Items
            </h1>
            <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl">
              Browse items recently found on campus and in the community.
            </p>
          </div>
          <Button
            onClick={() => setIsReportModalOpen(true)}
            className="h-11 px-6 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Report a Found Item
          </Button>
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search found items by name, location, or details..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
        </div>

        {foundItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {foundItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="group text-left bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    FOUND
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="font-bold text-neutral-900 group-hover:text-emerald-700">
                    {item.title}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500 mt-4">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.location}</span>
                    <span className="ml-auto shrink-0">{item.timeAgo}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-16">
            No found items match your search.
          </p>
        )}
      </div>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType="found"
        onAddItem={onAddItem}
      />
    </div>
  );
};

export default FoundItemsPage;

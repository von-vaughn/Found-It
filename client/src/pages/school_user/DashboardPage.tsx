import React, { useState, useRef, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ComposerCard } from "@/components/dashboard/ComposerCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ItemDetailModal } from "@/components/dashboard/ItemDetailModal";
import { CreatePostModal } from "@/components/dashboard/CreatePostModal";
import { SearchX } from "lucide-react";
import { initialItems, type Item } from "@/data/mockItems";

interface DashboardPageProps {
  items?: Item[];
  onAddItem?: (newItem: Item) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  items: propItems,
  onAddItem: propOnAddItem,
}) => {
  const [internalItems, setInternalItems] = useState<Item[]>(initialItems);
  const items = propItems ?? internalItems;

  const [activeNavTab, setActiveNavTab] = useState<string>("home");
  const [filterType, setFilterType] = useState<"all" | "lost" | "found">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<
    "lost" | "found"
  >("lost");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
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

  const handleAddItem = (newItem: Item) => {
    if (propOnAddItem) {
      propOnAddItem(newItem);
    }
    setInternalItems((prev) => [newItem, ...prev]);
  };

  const handleOpenCreateModal = (type: "lost" | "found" = "lost") => {
    setCreateModalInitialType(type);
    setCreateModalOpen(true);
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
  };


  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) {
        return false;
      }


      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesUser = item.username?.toLowerCase().includes(q) || false;
        return (
          matchesTitle || matchesDesc || matchesLoc || matchesCat || matchesUser
        );
      }

      return true;
    });
  }, [items, filterType, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex selection:bg-[#E5192D] selection:text-white font-sans text-neutral-900">
      <Sidebar
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === "discover") {
            setFilterType("all");
          } else if (tab === "search") {
            handleFocusSearch();
          }
        }}
        onOpenCreateModal={() => handleOpenCreateModal("lost")}
        onFocusSearch={handleFocusSearch}
      />

      <div className="flex-1 min-w-0 ml-16 md:ml-20 flex flex-col min-h-screen">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenReportModal={() => handleOpenCreateModal("lost")}
          searchInputRef={searchInputRef}
        />

        <main className="flex-1 min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-6 py-5 space-y-5">
          <ComposerCard
            onOpenReportModal={(type) => handleOpenCreateModal(type || "lost")}
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setFilterType("all")}
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${filterType === "all"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
                }`}
            >
              All
              {filterType === "all" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>

            <button
              onClick={() =>
                setFilterType(filterType === "lost" ? "all" : "lost")
              }
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${filterType === "lost"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
                }`}
            >
              Lost Item
              {filterType === "lost" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>

            <button
              onClick={() =>
                setFilterType(filterType === "found" ? "all" : "found")
              }
              className={`text-sm font-bold transition-all relative py-1 px-1 cursor-pointer mr-1 ${filterType === "found"
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
                }`}
            >
              Found Item
              {filterType === "found" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
              )}
            </button>

            {(searchQuery.trim() || filterType !== "all") && (
              <div className="ml-auto text-xs text-neutral-400 font-medium">
                Showing {filteredItems.length} items
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                    }}
                    className="ml-2 text-[#E5192D] hover:underline font-bold"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredItems.length > 0 ? (
            <div className="columns-1 md:columns-2 lg:columns-4 gap-4 pb-12">
              {filteredItems.map((item) => (
                <div key={item.id} className="mb-4 w-full break-inside-avoid">
                  <ItemCard item={item} onItemClick={setSelectedItem} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                <SearchX className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1">
                No matching items found
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mb-4">
                We couldn&apos;t find any items matching &ldquo;{searchQuery}
                &rdquo;. Try searching for another term or change your filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>

      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
        initialType={createModalInitialType}
      />
    </div>
  );
};

export default DashboardPage;

import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CreatePostForm } from "@/components/school_user/CreatePostForm";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import { useItemDetail } from "@/hooks/useItems";
import { toClientItem } from "@/lib/itemAdapter";
import type { ClaimRequest } from "@/types/claim";

interface CreatePostPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const CreatePostPage: React.FC<CreatePostPageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem,
  onUpdateItem,
  filters,
  onFiltersChange,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditingRoute = Boolean(id);
  const { data: serverItem, isLoading: isItemLoading } = useItemDetail(
    id ?? "",
  );
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const initialType =
    searchParams.get("type") === "found" ? "found" : "lost";

  const initialItem = useMemo(() => {
    if (!id) return null;
    if (serverItem) return toClientItem(serverItem);
    return items.find((entry) => entry.id === id) ?? null;
  }, [id, serverItem, items]);

  const isOwnReport = Boolean(
    serverItem && user?.id && serverItem.reporterId === user.id,
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  const handleAddItem = (newItem: Item) => {
    onAddItem?.(newItem);
    navigate("/dashboard");
  };

  const handleUpdateItem = (updatedItem: Item) => {
    onUpdateItem?.(updatedItem);
    navigate(id ? `/dashboard/items/${id}` : "/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="create"
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div
        className="sidebar-shift ml-0 flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:pb-0 md:ml-20 transition-[margin] duration-300"
      >
        <div className="hidden md:block">
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchInputRef={searchInputRef}
            activeFilterCount={countActiveFilters(filters)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={() => onFiltersChange(defaultFilters)}
            filterResultCount={applyAdvancedFilters(items, filters).length}
          />
        </div>

        <main className="mx-auto w-full max-w-[1440px] flex-1 bg-white px-4 py-6 sm:px-8 sm:py-8 lg:px-12 dark:bg-neutral-950">
          <div className="notifications-shift min-w-0 w-full transition-[margin,width] duration-300 ease-in-out">
            {isEditingRoute && isItemLoading && !initialItem ? (
              <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
                Loading report…
              </p>
            ) : isEditingRoute && (!initialItem || !isOwnReport) ? (
              <div className="mt-8 space-y-2">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {initialItem ? "Cannot edit this report" : "Report not found"}
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {initialItem
                    ? "Only the person who posted this report can edit it."
                    : "The report you are looking for may have been removed."}
                </p>
              </div>
            ) : (
              <>
                {isEditingRoute && (
                  <header className="mb-6">
                    <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                      Edit your report
                    </h1>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      Update the details or photos for your report.
                    </p>
                  </header>
                )}

                <CreatePostForm
                  active
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onSubmitted={() =>
                    navigate(id ? `/dashboard/items/${id}` : "/dashboard")
                  }
                  initialType={initialType}
                  initialItem={initialItem}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreatePostPage;

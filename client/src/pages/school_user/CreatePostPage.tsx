import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import type { ClaimRequest } from "@/types/claim";

interface CreatePostPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  onAddItem?: (newItem: Item) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const CreatePostPage: React.FC<CreatePostPageProps> = ({
  items: propItems,
  submittedClaims = [],
  onAddItem,
  filters,
  onFiltersChange,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const initialType =
    searchParams.get("type") === "found" ? "found" : "lost";

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

        <div
          className="notifications-shift min-w-0 w-full flex-1 transition-[margin,width] duration-300 ease-in-out"
        >
          <main className="mx-auto w-full max-w-[720px] bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-neutral-950">
            <button
              type="button"
              onClick={() =>
                window.history.length > 1
                  ? navigate(-1)
                  : navigate("/dashboard")
              }
              className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Go back
            </button>

            <header className="mt-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Post an item
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Report something you lost or found on campus.
              </p>
            </header>

            <CreatePostForm
              active
              onAddItem={handleAddItem}
              onSubmitted={() => navigate("/dashboard")}
              initialType={initialType}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;

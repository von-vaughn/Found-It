import React, { useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CreatePostForm,
  type CreatePostDraft,
} from "@/components/school_user/CreatePostForm";
import { FadeIn } from "@/components/FadeIn";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import { EMPTY_ITEMS } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import { useItemDetail } from "@/hooks/useItems";
import { toClientItem } from "@/lib/itemAdapter";

interface CreatePostPageProps {
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const CreatePostPage: React.FC<CreatePostPageProps> = ({
  filters,
  onFiltersChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditingRoute = Boolean(id);
  const { data: serverItem, isLoading: isItemLoading } = useItemDetail(
    id ?? "",
  );
  const items = EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const initialDraft =
    !isEditingRoute
      ? ((location.state as { draftFromRejectedClaim?: CreatePostDraft } | null)
          ?.draftFromRejectedClaim ?? null)
      : null;

  const initialType =
    initialDraft?.type ??
    (searchParams.get("type") === "found" ? "found" : "lost");

  const initialItem = useMemo(() => {
    if (!id || !serverItem) return null;
    return toClientItem(serverItem);
  }, [id, serverItem]);

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

  const handleAddItem = () => {
    navigate("/dashboard");
  };

  const handleUpdateItem = () => {
    navigate(id ? `/dashboard/items/${id}` : "/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-[#f7f7f8] font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="create"
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

        <main className="mx-auto w-full max-w-[1440px] flex-1 bg-[#f7f7f8] px-4 py-6 sm:px-8 sm:py-8 lg:px-12 dark:bg-neutral-950">
          <div className="notifications-shift min-w-0 w-full transition-[margin,width] duration-300 ease-in-out">
            {isEditingRoute && isItemLoading && !initialItem ? (
              <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
                Loading report…
              </p>
            ) : isEditingRoute && (!initialItem || !isOwnReport) ? (
              <FadeIn>
                <div className="mt-8 space-y-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {initialItem ? "Cannot edit this report" : "Report not found"}
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {initialItem
                      ? "Only the author can edit this report."
                      : "This report may have been removed."}
                  </p>
                </div>
              </FadeIn>
            ) : (
              <>
                {isEditingRoute && (
                  <FadeIn>
                    <header className="mb-6">
                      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Edit your report
                      </h1>
                    </header>
                  </FadeIn>
                )}

                {!isEditingRoute && (
                  <FadeIn>
                    <header>
                      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Post an item lost or found
                      </h1>
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                        Create a lost or found report so campus users can search
                        for the item, claim it, or return it to its owner.
                      </p>
                    </header>
                  </FadeIn>
                )}

                <FadeIn delay={0.05}>
                  <CreatePostForm
                    active
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onSubmitted={() =>
                      navigate(id ? `/dashboard/items/${id}` : "/dashboard")
                    }
                    initialType={initialType}
                    initialItem={initialItem}
                    initialDraft={initialDraft}
                  />
                </FadeIn>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreatePostPage;

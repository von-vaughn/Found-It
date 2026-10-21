import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OwnershipClaimForm } from "@/components/school_user/OwnershipClaimForm";
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
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";

interface ClaimPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
  onSubmitClaim?: (claim: NewClaimRequest) => Promise<void> | void;
}

export const ClaimPage: React.FC<ClaimPageProps> = ({
  items: propItems,
  submittedClaims = [],
  filters,
  onFiltersChange,
  onSubmitClaim,
}) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const [searchQuery, setSearchQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: serverItem, isLoading: isItemLoading } = useItemDetail(
    id ?? "",
  );
  const item = useMemo(
    () =>
      serverItem ? toClientItem(serverItem) : items.find((entry) => entry.id === id),
    [serverItem, items, id],
  );

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/dashboard");

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        activeTab="home"
        hideMobileNav
        items={items}
        submittedClaims={submittedClaims}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
          if (tab === "claims") navigate("/dashboard/claims");
        }}
        onOpenCreateModal={() => navigate("/dashboard/create")}
      />

      <div
        className="sidebar-shift ml-0 flex min-h-screen min-w-0 flex-1 flex-col md:ml-20 transition-[margin] duration-300"
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
          <main className="mx-auto w-full max-w-[640px] bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-neutral-950">
            {!submitted && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
            )}

            {isItemLoading && !item ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#E5192D]" />
              </div>
            ) : !item ? (
              <div className="py-16 text-center">
                <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
                  Item not found
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                  The item you are trying to claim may have been removed.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700"
                >
                  Back to dashboard
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : submitted ? (
              <div className="py-10 text-center">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Request submitted
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Please wait for approval. We&apos;ll notify you once your
                  request is approved or rejected.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/claims")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E5192D] px-5 text-xs font-bold text-white transition-colors hover:bg-[#c81424]"
                  >
                    View my claims
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Home
                  </button>
                </div>
              </div>
            ) : (
              <>
                <header className="mt-2 mb-1">
                  <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                    Claim request
                  </h1>
                  <p className="mt-1 truncate text-sm text-neutral-500 dark:text-neutral-400">
                    {item.title}
                  </p>
                </header>

                <div className="pb-8">
                  <OwnershipClaimForm
                    itemId={item.id}
                    itemTitle={item.title}
                    claimant={user?.name ?? "Campus user"}
                    onSubmitClaim={(claim) => onSubmitClaim?.(claim)}
                    onSubmitted={() => setSubmitted(true)}
                    onCancel={goBack}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ClaimPage;

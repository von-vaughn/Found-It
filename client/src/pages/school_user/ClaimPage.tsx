import React, { useRef, useState } from "react";
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
import { initialItems, type Item } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";

interface ClaimPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
  onSubmitClaim?: (claim: NewClaimRequest) => void;
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
  const items = propItems ?? initialItems;
  const [searchQuery, setSearchQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const item = items.find((entry) => entry.id === id);

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
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <Sidebar
        activeTab="home"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
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
        className={`ml-0 flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ${
          sidebarExpanded ? "md:ml-60" : "md:ml-20"
        }`}
      >
        <div className="hidden md:block">
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchInputRef={searchInputRef}
            notificationsOpen={notificationsOpen}
            activeFilterCount={countActiveFilters(filters)}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={() => onFiltersChange(defaultFilters)}
            filterResultCount={applyAdvancedFilters(items, filters).length}
          />
        </div>

        <div
          className={`min-w-0 flex-1 transition-[margin,width] duration-300 ease-in-out ${
            notificationsOpen
              ? "md:ml-80 md:w-[calc(100%-20rem)]"
              : "w-full"
          }`}
        >
          <main className="mx-auto w-full max-w-[640px] bg-white px-4 py-6 sm:px-6 lg:px-8">
            {!submitted && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
            )}

            {!item ? (
              <div className="py-16 text-center">
                <h1 className="text-lg font-extrabold text-neutral-900">
                  Item not found
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
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
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
                  Request submitted
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
                  Please wait for approval. We&apos;ll notify you once your
                  request is approved or rejected.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-xs font-bold text-white transition-colors hover:bg-neutral-700"
                  >
                    Home
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <header className="mt-2 mb-1">
                  <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
                    Claim request
                  </h1>
                  <p className="mt-1 truncate text-sm text-neutral-500">
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

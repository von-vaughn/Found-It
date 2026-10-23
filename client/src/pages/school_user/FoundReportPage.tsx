import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FoundReportFlow, type FoundFlowStep } from "@/components/school_user/FoundReportFlow";
import { Header } from "@/components/school_user/Header";
import { Sidebar } from "@/components/school_user/Sidebar";
import {
  applyAdvancedFilters,
  countActiveFilters,
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import { EMPTY_ITEMS, type Item } from "@/data/mockItems";
import { useItemDetail } from "@/hooks/useItems";
import type { ClaimRequest } from "@/types/claim";

interface FoundReportPageProps {
  items?: Item[];
  submittedClaims?: ClaimRequest[];
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export const FoundReportPage: React.FC<FoundReportPageProps> = ({
  items: propItems,
  submittedClaims = [],
  filters,
  onFiltersChange,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const items = propItems ?? EMPTY_ITEMS;
  const { data: serverItem, isLoading: isItemLoading } = useItemDetail(
    id ?? "",
  );
  const lostItemTitle =
    serverItem?.name ?? items.find((item) => item.id === id)?.title ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [flowStep, setFlowStep] = useState<FoundFlowStep>("camera");
  const searchInputRef = useRef<HTMLInputElement>(null);

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
            {flowStep !== "confirmation" && (
              <button
                type="button"
                onClick={flowStep === "camera" ? goBack : () => setFlowStep("camera")}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
            )}

            <div className="mt-3 pb-8">
              {isItemLoading && !lostItemTitle ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading item…
                </p>
              ) : (
                <FoundReportFlow
                  key={id}
                  active
                  framed={false}
                  onExit={goBack}
                  step={flowStep}
                  onStepChange={setFlowStep}
                  lostItemId={id ?? ""}
                  lostItemTitle={lostItemTitle}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FoundReportPage;

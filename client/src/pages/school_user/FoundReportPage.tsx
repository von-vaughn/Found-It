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
  const [searchQuery, setSearchQuery] = useState("");
  const [flowStep, setFlowStep] = useState<FoundFlowStep>("camera");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
            {flowStep === "camera" ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setFlowStep(flowStep === "details" ? "camera" : "details")
                }
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
            )}

            <div className="mt-3 pb-8">
              <FoundReportFlow
                key={id}
                active
                framed={false}
                onExit={goBack}
                step={flowStep}
                onStepChange={setFlowStep}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FoundReportPage;

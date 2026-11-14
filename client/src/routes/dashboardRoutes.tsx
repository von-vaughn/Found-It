import type { RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/school_user/DashboardPage";
import { CreatePostPage } from "@/pages/school_user/CreatePostPage";
import { NotificationsPage } from "@/pages/school_user/NotificationsPage";
import { ItemDetailPage } from "@/pages/school_user/ItemDetailPage";
import { FoundReportPage } from "@/pages/school_user/FoundReportPage";
import { ClaimPage } from "@/pages/school_user/ClaimPage";
import { MyClaimsPage } from "@/pages/school_user/MyClaimsPage";
import { FiltersPage } from "@/pages/school_user/FiltersPage";
import { ProfilePage } from "@/pages/school_user/ProfilePage";
import type {
  ClaimRequest,
  NewClaimRequest,
} from "@/types/claim";
import type { ItemFilters } from "@/components/school_user/itemFilters";
import { paths } from "./paths";

interface DashboardRoutesOptions {
  submittedClaims: ClaimRequest[];
  foundReports: ClaimRequest[];
  onSubmitClaim: (claim: NewClaimRequest) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export function getDashboardRoutes({
  submittedClaims,
  foundReports,
  onSubmitClaim,
  filters,
  onFiltersChange,
}: DashboardRoutesOptions): RouteObject[] {
  return [
    {
      path: paths.dashboard,
      element: (
        <DashboardPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardFilters,
      element: (
        <FiltersPage
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardCreate,
      element: (
        <CreatePostPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardNotifications,
      element: (
        <NotificationsPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardItem,
      element: (
        <ItemDetailPage
          onSubmitClaim={onSubmitClaim}
          submittedClaims={submittedClaims}
          foundReports={foundReports}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardItemEdit,
      element: (
        <CreatePostPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardFoundReport,
      element: (
        <FoundReportPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardClaim,
      element: (
        <ClaimPage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSubmitClaim={onSubmitClaim}
        />
      ),
    },
    {
      path: paths.dashboardProfile,
      element: (
        <ProfilePage
          submittedClaims={submittedClaims}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardClaims,
      element: (
        <MyClaimsPage
          submittedClaims={submittedClaims}
          foundReports={foundReports}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
  ];
}

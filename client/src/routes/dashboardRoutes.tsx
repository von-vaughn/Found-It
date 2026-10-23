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
import type { Item } from "@/data/mockItems";
import type {
  ClaimRequest,
  NewClaimRequest,
  NewReturnItemRequest,
  ReturnItemRequest,
} from "@/types/claim";
import type { ItemFilters } from "@/components/school_user/itemFilters";
import { paths } from "./paths";

interface DashboardRoutesOptions {
  items: Item[];
  submittedClaims: ClaimRequest[];
  foundReports: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimRequest["status"]) => void;
  onSubmitReturnRequest: (request: NewReturnItemRequest) => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export function getDashboardRoutes({
  items,
  submittedClaims,
  foundReports,
  returnRequests,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSubmitClaim,
  onUpdateClaimStatus,
  onSubmitReturnRequest,
  filters,
  onFiltersChange,
}: DashboardRoutesOptions): RouteObject[] {
  return [
    {
      path: paths.dashboard,
      element: (
        <DashboardPage
          submittedClaims={submittedClaims}
          onAddItem={onAddItem}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardFilters,
      element: (
        <FiltersPage
          items={items}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardCreate,
      element: (
        <CreatePostPage
          items={items}
          submittedClaims={submittedClaims}
          onAddItem={onAddItem}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardNotifications,
      element: (
        <NotificationsPage
          items={items}
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
          items={items}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onSubmitClaim={onSubmitClaim}
          onUpdateClaimStatus={onUpdateClaimStatus}
          submittedClaims={submittedClaims}
          foundReports={foundReports}
          returnRequests={returnRequests}
          onSubmitReturnRequest={onSubmitReturnRequest}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardFoundReport,
      element: (
        <FoundReportPage
          items={items}
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
          items={items}
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
          items={items}
          submittedClaims={submittedClaims}
          onAddItem={onAddItem}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
    {
      path: paths.dashboardClaims,
      element: (
        <MyClaimsPage
          items={items}
          submittedClaims={submittedClaims}
          foundReports={foundReports}
          onAddItem={onAddItem}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ),
    },
  ];
}

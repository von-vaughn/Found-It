import { Navigate, useRoutes } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import type {
  ClaimRequest,
  NewClaimRequest,
  NewReturnItemRequest,
  ReturnItemRequest,
} from "@/types/claim";
import { paths } from "./paths";
import { getPublicRoutes } from "./publicRoutes";
import { getDashboardRoutes } from "./dashboardRoutes";
import { getAdminRoutes } from "./adminRoutes";
import { getSuperAdminRoutes } from "./superAdminRoutes";
import type { ItemFilters } from "@/components/school_user/itemFilters";

interface AppRoutesProps {
  items: Item[];
  submittedClaims: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string, reason?: string) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimRequest["status"]) => void;
  onSubmitReturnRequest: (request: NewReturnItemRequest) => void;
  onUpdateReturnRequestStatus: (
    requestId: string,
    status: ReturnItemRequest["status"],
  ) => void;
  onBrowseLost: () => void;
  onBrowseFound: () => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export function AppRoutes({
  items,
  submittedClaims,
  returnRequests,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSubmitClaim,
  onUpdateClaimStatus,
  onSubmitReturnRequest,
  onUpdateReturnRequestStatus,
  onBrowseLost,
  onBrowseFound,
  filters,
  onFiltersChange,
}: AppRoutesProps) {
  return useRoutes([
    ...getPublicRoutes({ items, onAddItem, onBrowseLost, onBrowseFound }),
    ...getDashboardRoutes({
      items,
      submittedClaims,
      returnRequests,
      onAddItem,
      onUpdateItem,
      onDeleteItem,
      onSubmitClaim,
      onUpdateClaimStatus,
      onSubmitReturnRequest,
      filters,
      onFiltersChange,
    }),
    ...getAdminRoutes({
      items,
      onAddItem,
      onDeleteItem,
      submittedClaims,
      returnRequests,
      onUpdateReturnRequestStatus,
    }),
    ...getSuperAdminRoutes({
      items,
      onAddItem,
      onDeleteItem,
      submittedClaims,
      returnRequests,
      onUpdateReturnRequestStatus,
    }),
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

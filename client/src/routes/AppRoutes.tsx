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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
  const publicRoutes = getPublicRoutes({
    items,
    onAddItem,
    onBrowseLost,
    onBrowseFound,
  });

  const dashboardRoutes = getDashboardRoutes({
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
  }).map((route) => ({
    ...route,
    element: (
      <ProtectedRoute allowedRoles={["school_user", "admin", "super_admin"]}>
        {route.element}
      </ProtectedRoute>
    ),
  }));

  const adminRoutes = getAdminRoutes({
    items,
    onAddItem,
    onDeleteItem,
    submittedClaims,
    returnRequests,
    onUpdateReturnRequestStatus,
  }).map((route) => ({
    ...route,
    element: (
      <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
        {route.element}
      </ProtectedRoute>
    ),
  }));

  const superAdminRoutes = getSuperAdminRoutes({
    items,
    onAddItem,
    onDeleteItem,
    submittedClaims,
    returnRequests,
    onUpdateReturnRequestStatus,
  }).map((route) => ({
    ...route,
    element: (
      <ProtectedRoute allowedRoles={["super_admin"]}>
        {route.element}
      </ProtectedRoute>
    ),
  }));

  return useRoutes([
    ...publicRoutes,
    ...dashboardRoutes,
    ...adminRoutes,
    ...superAdminRoutes,
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

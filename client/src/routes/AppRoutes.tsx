import { useMemo } from "react";
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
import type { ItemFilters } from "@/components/school_user/itemFilters";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useCreateClaim, useMyClaims } from "@/hooks/useClaims";
import { useMyReturns } from "@/hooks/useReturns";
import { toClaimRequests, toFoundReportClaims } from "@/lib/claimAdapter";

interface AppRoutesProps {
  items: Item[];
  /** Example claims used only by the admin demo views. */
  submittedClaims: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string, reason?: string) => void;
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
  submittedClaims: exampleClaims,
  returnRequests,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateClaimStatus,
  onSubmitReturnRequest,
  onUpdateReturnRequestStatus,
  onBrowseLost,
  onBrowseFound,
  filters,
  onFiltersChange,
}: AppRoutesProps) {
  const { data: serverClaims = [] } = useMyClaims();
  const { data: serverReturns = [] } = useMyReturns();
  const createClaimMutation = useCreateClaim();
  const submittedClaims = useMemo(
    () => toClaimRequests(serverClaims),
    [serverClaims],
  );
  const foundReports = useMemo(
    () => toFoundReportClaims(serverReturns),
    [serverReturns],
  );

  const handleSubmitClaim = async (claim: NewClaimRequest) => {
    await createClaimMutation.mutateAsync({
      itemId: claim.itemId,
      claimantTitle: claim.claimantTitle ?? claim.item,
      color: claim.color,
      building: claim.building,
      dateLost: claim.dateLost,
      timeLost: claim.timeLost,
      location: claim.location,
      details: claim.details,
      importantDetails: claim.importantDetails ?? "",
      evidence: claim.evidence,
    });
  };

  const publicRoutes = getPublicRoutes({
    items,
    onAddItem,
    onBrowseLost,
    onBrowseFound,
  });

  const dashboardRoutes = getDashboardRoutes({
    items,
    submittedClaims,
    foundReports,
    returnRequests,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onSubmitClaim: handleSubmitClaim,
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
    submittedClaims: exampleClaims,
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

  return useRoutes([
    ...publicRoutes,
    ...dashboardRoutes,
    ...adminRoutes,
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

import { useMemo } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import type { NewClaimRequest } from "@/types/claim";
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
  onBrowseLost: () => void;
  onBrowseFound: () => void;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
}

export function AppRoutes({
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
    onBrowseLost,
    onBrowseFound,
  });

  const dashboardRoutes = getDashboardRoutes({
    submittedClaims,
    foundReports,
    onSubmitClaim: handleSubmitClaim,
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

  const adminRoutes = getAdminRoutes().map((route) => ({
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

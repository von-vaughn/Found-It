import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import type { ClaimRequest } from "@/types/claim";
import { paths } from "./paths";

interface AdminRoutesOptions {
  submittedClaims: ClaimRequest[];
}

export function getAdminRoutes({
  submittedClaims,
}: AdminRoutesOptions): RouteObject[] {
  return [
    { path: paths.admin, element: <OverviewPage /> },
    { path: paths.adminItems, element: <ReportsPage /> },
    { path: paths.adminLost, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.adminFound, element: <Navigate to={paths.adminItems} replace /> },
    {
      path: paths.adminClaims,
      element: <ClaimsPage additionalClaims={submittedClaims} />,
    },
  ];
}

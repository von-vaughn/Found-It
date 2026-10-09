import type { RouteObject } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { LostReportsPage } from "@/pages/admin/LostReportsPage";
import { FoundReportsPage } from "@/pages/admin/FoundReportsPage";
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
    { path: paths.adminLost, element: <LostReportsPage /> },
    { path: paths.adminFound, element: <FoundReportsPage /> },
    {
      path: paths.adminClaims,
      element: <ClaimsPage additionalClaims={submittedClaims} />,
    },
  ];
}

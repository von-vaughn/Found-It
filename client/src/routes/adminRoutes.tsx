import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ReportedItemsPage } from "@/pages/admin/ReportedItemsPage";
import { AdminCreatePostPage } from "@/pages/admin/AdminCreatePostPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import { ClaimDetailPage } from "@/pages/admin/ClaimDetailPage";
import { ReturnItemDetailPage } from "@/pages/admin/ReturnItemDetailPage";
import { WalkInPage } from "@/pages/admin/WalkInPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { paths } from "./paths";

export function getAdminRoutes(): RouteObject[] {
  return [
    { path: paths.admin, element: <OverviewPage /> },
    {
      path: paths.adminItems,
      element: <ReportsPage />,
    },
    {
      path: paths.adminItemsNew,
      element: <AdminCreatePostPage />,
    },
    {
      path: paths.adminReported,
      element: <ReportedItemsPage />,
    },
    {
      path: paths.adminReportedDetail,
      element: <ReportedItemsPage />,
    },
    { path: paths.adminLost, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.adminFound, element: <Navigate to={paths.adminItems} replace /> },
    {
      path: paths.adminClaims,
      element: <ClaimsPage />,
    },
    {
      path: paths.adminClaimDetail,
      element: <ClaimDetailPage />,
    },
    {
      path: paths.adminReturns,
      element: <Navigate to={`${paths.adminClaims}?tab=returns`} replace />,
    },
    {
      path: paths.adminReturnDetail,
      element: <ReturnItemDetailPage />,
    },
    {
      path: paths.adminWalkIn,
      element: <WalkInPage />,
    },
    {
      // User management is admin only; staff bounce back to the dashboard.
      path: paths.adminUsers,
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <UsersPage />
        </ProtectedRoute>
      ),
    },
    {
      path: paths.adminFilterOptions,
      element: <Navigate to={paths.adminItems} replace />,
    },
    {
      // Audit logs are admin only; staff bounce back to the dashboard.
      path: paths.adminAudit,
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AuditLogsPage />
        </ProtectedRoute>
      ),
    },
  ];
}

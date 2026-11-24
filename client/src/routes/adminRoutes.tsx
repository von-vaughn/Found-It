import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ReportedItemsPage } from "@/pages/admin/ReportedItemsPage";
import { AdminCreatePostPage } from "@/pages/admin/AdminCreatePostPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import { ClaimDetailPage } from "@/pages/admin/ClaimDetailPage";
import { ReturnItemDetailPage } from "@/pages/admin/ReturnItemDetailPage";
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
      // User management is super-admin only; plain admins bounce back to the dashboard.
      path: paths.adminUsers,
      element: (
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <UsersPage />
        </ProtectedRoute>
      ),
    },
    {
      path: paths.adminFilterOptions,
      element: <Navigate to={paths.adminItems} replace />,
    },
    {
      // Audit logs are super-admin only; plain admins bounce back to the dashboard.
      path: paths.adminAudit,
      element: (
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <AuditLogsPage />
        </ProtectedRoute>
      ),
    },

    // Legacy /superadmin/* URLs — old bookmarks land on the merged admin pages.
    { path: paths.superadmin, element: <Navigate to={paths.admin} replace /> },
    { path: paths.superadminItems, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.superadminLost, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.superadminFound, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.superadminClaims, element: <Navigate to={paths.adminClaims} replace /> },
    {
      path: paths.superadminReturns,
      element: <Navigate to={`${paths.adminClaims}?tab=returns`} replace />,
    },
    { path: paths.superadminUsers, element: <Navigate to={paths.adminUsers} replace /> },
    {
      path: paths.superadminFilterOptions,
      element: <Navigate to={paths.adminItems} replace />,
    },
    {
      path: paths.superadminAdmins,
      element: <Navigate to={`${paths.adminUsers}?tab=admins`} replace />,
    },
    { path: paths.superadminAudit, element: <Navigate to={paths.adminAudit} replace /> },
  ];
}

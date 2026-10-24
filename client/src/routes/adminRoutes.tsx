import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import { ReturnItemsPage } from "@/pages/admin/ReturnItemsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { FilterOptionsPage } from "@/pages/admin/FilterOptionsPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";
import { paths } from "./paths";

interface AdminRoutesOptions {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  returnRequests: ReturnItemRequest[];
}

export function getAdminRoutes({
  items,
  onAddItem,
  returnRequests,
}: AdminRoutesOptions): RouteObject[] {
  return [
    { path: paths.admin, element: <OverviewPage items={items} returnRequests={returnRequests} /> },
    {
      path: paths.adminItems,
      element: <ReportsPage onAddItem={onAddItem} />,
    },
    { path: paths.adminLost, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.adminFound, element: <Navigate to={paths.adminItems} replace /> },
    {
      path: paths.adminClaims,
      element: <ClaimsPage />,
    },
    {
      path: paths.adminReturns,
      element: <ReturnItemsPage />,
    },
    {
      path: paths.adminUsers,
      element: <UsersPage />,
    },
    {
      path: paths.adminFilterOptions,
      element: (
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <FilterOptionsPage />
        </ProtectedRoute>
      ),
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
    { path: paths.superadminReturns, element: <Navigate to={paths.adminReturns} replace /> },
    { path: paths.superadminUsers, element: <Navigate to={paths.adminUsers} replace /> },
    {
      path: paths.superadminFilterOptions,
      element: <Navigate to={paths.adminFilterOptions} replace />,
    },
    {
      path: paths.superadminAdmins,
      element: <Navigate to={`${paths.adminUsers}?tab=admins`} replace />,
    },
    { path: paths.superadminAudit, element: <Navigate to={paths.adminAudit} replace /> },
  ];
}

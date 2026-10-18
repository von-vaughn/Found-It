import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import { ReturnItemsPage } from "@/pages/admin/ReturnItemsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { Item } from "@/data/mockItems";
import type { ClaimRequest, ReturnItemRequest } from "@/types/claim";
import { paths } from "./paths";

interface AdminRoutesOptions {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onDeleteItem: (id: string, reason?: string) => void;
  submittedClaims: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onUpdateReturnRequestStatus: (
    requestId: string,
    status: ReturnItemRequest["status"],
  ) => void;
}

export function getAdminRoutes({
  items,
  onAddItem,
  onDeleteItem,
  submittedClaims,
  returnRequests,
  onUpdateReturnRequestStatus,
}: AdminRoutesOptions): RouteObject[] {
  return [
    { path: paths.admin, element: <OverviewPage items={items} returnRequests={returnRequests} /> },
    {
      path: paths.adminItems,
      element: (
        <ReportsPage
          items={items}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
        />
      ),
    },
    { path: paths.adminLost, element: <Navigate to={paths.adminItems} replace /> },
    { path: paths.adminFound, element: <Navigate to={paths.adminItems} replace /> },
    {
      path: paths.adminClaims,
      element: <ClaimsPage items={items} additionalClaims={submittedClaims} />,
    },
    {
      path: paths.adminReturns,
      element: (
        <ReturnItemsPage
          items={items}
          requests={returnRequests}
          onStatusChange={onUpdateReturnRequestStatus}
        />
      ),
    },
    {
      path: paths.adminUsers,
      element: <UsersPage />,
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
      path: paths.superadminAdmins,
      element: <Navigate to={`${paths.adminUsers}?tab=admins`} replace />,
    },
    { path: paths.superadminAudit, element: <Navigate to={paths.adminAudit} replace /> },
  ];
}

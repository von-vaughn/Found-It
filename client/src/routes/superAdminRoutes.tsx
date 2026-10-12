import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { SuperAdminOverviewPage } from "@/pages/superadmin/SuperAdminOverviewPage";
import { SuperAdminReportsPage } from "@/pages/superadmin/SuperAdminReportsPage";
import { SuperAdminClaimsPage } from "@/pages/superadmin/SuperAdminClaimsPage";
import { SuperAdminReturnsPage } from "@/pages/superadmin/SuperAdminReturnsPage";
import { SuperAdminUsersPage } from "@/pages/superadmin/SuperAdminUsersPage";
import { AuditLogsPage } from "@/pages/superadmin/AuditLogsPage";
import type { Item } from "@/data/mockItems";
import type { ClaimRequest, ReturnItemRequest } from "@/types/claim";
import { paths } from "./paths";

interface SuperAdminRoutesOptions {
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

export function getSuperAdminRoutes({
  items,
  onAddItem,
  onDeleteItem,
  submittedClaims,
  returnRequests,
  onUpdateReturnRequestStatus,
}: SuperAdminRoutesOptions): RouteObject[] {
  return [
    { path: paths.superadmin, element: <SuperAdminOverviewPage /> },
    {
      path: paths.superadminItems,
      element: (
        <SuperAdminReportsPage
          items={items}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
        />
      ),
    },
    {
      path: paths.superadminLost,
      element: <Navigate to={paths.superadminItems} replace />,
    },
    {
      path: paths.superadminFound,
      element: <Navigate to={paths.superadminItems} replace />,
    },
    {
      path: paths.superadminClaims,
      element: (
        <SuperAdminClaimsPage items={items} additionalClaims={submittedClaims} />
      ),
    },
    {
      path: paths.superadminReturns,
      element: (
        <SuperAdminReturnsPage
          items={items}
          requests={returnRequests}
          onStatusChange={onUpdateReturnRequestStatus}
        />
      ),
    },
    {
      path: paths.superadminUsers,
      element: <SuperAdminUsersPage />,
    },
    {
      // Backwards compat: old standalone admins page now lives as a tab inside Users.
      path: paths.superadminAdmins,
      element: <Navigate to={`${paths.superadminUsers}?tab=admins`} replace />,
    },
    {
      path: paths.superadminAudit,
      element: <AuditLogsPage />,
    },
  ];
}

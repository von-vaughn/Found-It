import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { OverviewPage } from "@/pages/admin/OverviewPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { ClaimsPage } from "@/pages/admin/ClaimsPage";
import type { Item } from "@/data/mockItems";
import { ReturnItemsPage } from "@/pages/admin/ReturnItemsPage";
import type { ClaimRequest, ReturnItemRequest } from "@/types/claim";
import { paths } from "./paths";

interface AdminRoutesOptions {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onDeleteItem: (id: string) => void;
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
    { path: paths.admin, element: <OverviewPage /> },
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
  ];
}

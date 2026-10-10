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
import { getAuthRoutes } from "./authRoutes";

interface AppRoutesProps {
  items: Item[];
  submittedClaims: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimRequest["status"]) => void;
  onSubmitReturnRequest: (request: NewReturnItemRequest) => void;
  onUpdateReturnRequestStatus: (
    requestId: string,
    status: ReturnItemRequest["status"],
  ) => void;
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export function AppRoutes({
  items,
  submittedClaims,
  returnRequests,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSubmitClaim,
  onUpdateClaimStatus,
  onSubmitReturnRequest,
  onUpdateReturnRequestStatus,
  onBrowseLost,
  onBrowseFound,
}: AppRoutesProps) {
  return useRoutes([
    ...getPublicRoutes({ items, onAddItem, onBrowseLost, onBrowseFound }),
    ...getDashboardRoutes({
      items,
      submittedClaims,
      returnRequests,
      onAddItem,
      onUpdateItem,
      onDeleteItem,
      onSubmitClaim,
      onUpdateClaimStatus,
      onSubmitReturnRequest,
    }),
    ...getAdminRoutes({
      items,
      onAddItem,
      onDeleteItem,
      submittedClaims,
      returnRequests,
      onUpdateReturnRequestStatus,
    }),
    ...getAuthRoutes(),
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

import { Navigate, useRoutes } from "react-router-dom";
import type { Item } from "@/data/mockItems";
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";
import { paths } from "./paths";
import { getPublicRoutes } from "./publicRoutes";
import { getDashboardRoutes } from "./dashboardRoutes";
import { getAdminRoutes } from "./adminRoutes";
import { getAuthRoutes } from "./authRoutes";

interface AppRoutesProps {
  items: Item[];
  submittedClaims: ClaimRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimRequest["status"]) => void;
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export function AppRoutes({
  items,
  submittedClaims,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSubmitClaim,
  onUpdateClaimStatus,
  onBrowseLost,
  onBrowseFound,
}: AppRoutesProps) {
  return useRoutes([
    ...getPublicRoutes({ items, onAddItem, onBrowseLost, onBrowseFound }),
    ...getDashboardRoutes({
      items,
      submittedClaims,
      onAddItem,
      onUpdateItem,
      onDeleteItem,
      onSubmitClaim,
      onUpdateClaimStatus,
    }),
    ...getAdminRoutes({ submittedClaims }),
    ...getAuthRoutes(),
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

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
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export function AppRoutes({
  items,
  submittedClaims,
  onAddItem,
  onSubmitClaim,
  onBrowseLost,
  onBrowseFound,
}: AppRoutesProps) {
  return useRoutes([
    ...getPublicRoutes({ items, onAddItem, onBrowseLost, onBrowseFound }),
    ...getDashboardRoutes({ items, onAddItem, onSubmitClaim }),
    ...getAdminRoutes({ submittedClaims }),
    ...getAuthRoutes(),
    {
      path: paths.fallback,
      element: <Navigate to={paths.home} replace />,
    },
  ]);
}

import type { RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/school_user/DashboardPage";
import { ItemDetailPage } from "@/pages/school_user/ItemDetailPage";
import { ProfilePage } from "@/pages/school_user/ProfilePage";
import type { Item } from "@/data/mockItems";
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";
import { paths } from "./paths";

interface DashboardRoutesOptions {
  items: Item[];
  submittedClaims: ClaimRequest[];
  onAddItem: (newItem: Item) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
}

export function getDashboardRoutes({
  items,
  submittedClaims,
  onAddItem,
  onSubmitClaim,
}: DashboardRoutesOptions): RouteObject[] {
  return [
    {
      path: paths.dashboard,
      element: (
        <DashboardPage
          items={items}
          submittedClaims={submittedClaims}
          onAddItem={onAddItem}
        />
      ),
    },
    {
      path: paths.dashboardItem,
      element: (
        <ItemDetailPage
          items={items}
          onAddItem={onAddItem}
          onSubmitClaim={onSubmitClaim}
          submittedClaims={submittedClaims}
        />
      ),
    },
    {
      path: paths.dashboardProfile,
      element: (
        <ProfilePage
          items={items}
          submittedClaims={submittedClaims}
          onAddItem={onAddItem}
        />
      ),
    },
  ];
}

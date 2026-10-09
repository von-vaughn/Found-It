import type { RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/school_user/DashboardPage";
import { ItemDetailPage } from "@/pages/school_user/ItemDetailPage";
import { ProfilePage } from "@/pages/school_user/ProfilePage";
import type { Item } from "@/data/mockItems";
import type { NewClaimRequest } from "@/types/claim";
import { paths } from "./paths";

interface DashboardRoutesOptions {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
}

export function getDashboardRoutes({
  items,
  onAddItem,
  onSubmitClaim,
}: DashboardRoutesOptions): RouteObject[] {
  return [
    {
      path: paths.dashboard,
      element: <DashboardPage items={items} onAddItem={onAddItem} />,
    },
    {
      path: paths.dashboardItem,
      element: (
        <ItemDetailPage
          items={items}
          onAddItem={onAddItem}
          onSubmitClaim={onSubmitClaim}
        />
      ),
    },
    {
      path: paths.dashboardProfile,
      element: <ProfilePage items={items} onAddItem={onAddItem} />,
    },
  ];
}

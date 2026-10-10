import type { RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/school_user/DashboardPage";
import { ItemDetailPage } from "@/pages/school_user/ItemDetailPage";
import { ProfilePage } from "@/pages/school_user/ProfilePage";
import type { Item } from "@/data/mockItems";
import type {
  ClaimRequest,
  NewClaimRequest,
  NewReturnItemRequest,
  ReturnItemRequest,
} from "@/types/claim";
import { paths } from "./paths";

interface DashboardRoutesOptions {
  items: Item[];
  submittedClaims: ClaimRequest[];
  returnRequests: ReturnItemRequest[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (id: string) => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimRequest["status"]) => void;
  onSubmitReturnRequest: (request: NewReturnItemRequest) => void;
}

export function getDashboardRoutes({
  items,
  submittedClaims,
  returnRequests,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSubmitClaim,
  onUpdateClaimStatus,
  onSubmitReturnRequest,
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
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onSubmitClaim={onSubmitClaim}
          onUpdateClaimStatus={onUpdateClaimStatus}
          submittedClaims={submittedClaims}
          returnRequests={returnRequests}
          onSubmitReturnRequest={onSubmitReturnRequest}
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

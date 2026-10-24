import type { RouteObject } from "react-router-dom";
import { HomePage } from "@/pages/landing/HomePage";
import { BrowseItemsPage } from "@/pages/landing/BrowseItemsPage";
import { BrowseFiltersPage } from "@/pages/landing/BrowseFiltersPage";
import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";
import { RedirectIfSchoolUser } from "@/components/auth/RedirectIfSchoolUser";
import { LegacyItemsRedirect } from "./LegacyItemsRedirect";
import type { Item } from "@/data/mockItems";
import { paths } from "./paths";

interface PublicRoutesOptions {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export function getPublicRoutes({
  items,
  onAddItem,
  onBrowseLost,
  onBrowseFound,
}: PublicRoutesOptions): RouteObject[] {
  return [
    {
      path: paths.home,
      element: (
        <RedirectIfAuthenticated>
          <HomePage onBrowseLost={onBrowseLost} onBrowseFound={onBrowseFound} />
        </RedirectIfAuthenticated>
      ),
    },
    {
      path: paths.browse,
      element: (
        <RedirectIfSchoolUser>
          <BrowseItemsPage items={items} onAddItem={onAddItem} />
        </RedirectIfSchoolUser>
      ),
    },
    {
      path: paths.browseFilters,
      element: (
        <RedirectIfSchoolUser>
          <BrowseFiltersPage items={items} />
        </RedirectIfSchoolUser>
      ),
    },
    {
      path: paths.lostItems,
      element: (
        <RedirectIfSchoolUser>
          <LegacyItemsRedirect type="lost" />
        </RedirectIfSchoolUser>
      ),
    },
    {
      path: paths.foundItems,
      element: (
        <RedirectIfSchoolUser>
          <LegacyItemsRedirect type="found" />
        </RedirectIfSchoolUser>
      ),
    },
  ];
}

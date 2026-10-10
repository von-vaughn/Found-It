import type { RouteObject } from "react-router-dom";
import { HomePage } from "@/pages/landing/HomePage";
import { BrowseItemsPage } from "@/pages/landing/BrowseItemsPage";
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
        <HomePage onBrowseLost={onBrowseLost} onBrowseFound={onBrowseFound} />
      ),
    },
    {
      path: paths.browse,
      element: <BrowseItemsPage items={items} onAddItem={onAddItem} />,
    },
    {
      path: paths.lostItems,
      element: <LegacyItemsRedirect type="lost" />,
    },
    {
      path: paths.foundItems,
      element: <LegacyItemsRedirect type="found" />,
    },
  ];
}

import type { RouteObject } from "react-router-dom";
import { HomePage } from "@/pages/landing/HomePage";
import { LostItemsPage } from "@/pages/landing/LostItemsPage";
import { FoundItemsPage } from "@/pages/landing/FoundItemsPage";
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
      path: paths.lostItems,
      element: <LostItemsPage items={items} onAddItem={onAddItem} />,
    },
    {
      path: paths.foundItems,
      element: <FoundItemsPage items={items} onAddItem={onAddItem} />,
    },
  ];
}

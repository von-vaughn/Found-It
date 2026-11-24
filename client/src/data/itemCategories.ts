import {
  BookOpen,
  BriefcaseBusiness,
  ContactRound,
  CreditCard,
  Dumbbell,
  FileText,
  Glasses,
  Gem,
  KeyRound,
  Package,
  Shirt,
  Smartphone,
  CupSoda,
  Umbrella,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { ITEM_CATEGORY_LABELS } from "../lib/categoryLabel";

export const ITEM_CATEGORIES = [
  { id: "electronics", label: ITEM_CATEGORY_LABELS.electronics, icon: Smartphone },
  { id: "id", label: ITEM_CATEGORY_LABELS.id, icon: ContactRound },
  { id: "cards", label: ITEM_CATEGORY_LABELS.cards, icon: CreditCard },
  { id: "bags", label: ITEM_CATEGORY_LABELS.bags, icon: BriefcaseBusiness },
  { id: "wallets-purses", label: ITEM_CATEGORY_LABELS["wallets-purses"], icon: WalletCards },
  { id: "keys", label: ITEM_CATEGORY_LABELS.keys, icon: KeyRound },
  {
    id: "clothing-accessories",
    label: ITEM_CATEGORY_LABELS["clothing-accessories"],
    icon: Shirt,
  },
  {
    id: "books-school-supplies",
    label: ITEM_CATEGORY_LABELS["books-school-supplies"],
    icon: BookOpen,
  },
  { id: "jewelry", label: ITEM_CATEGORY_LABELS.jewelry, icon: Gem },
  { id: "eyewear", label: ITEM_CATEGORY_LABELS.eyewear, icon: Glasses },
  { id: "tumblers", label: ITEM_CATEGORY_LABELS.tumblers, icon: CupSoda },
  { id: "umbrellas", label: ITEM_CATEGORY_LABELS.umbrellas, icon: Umbrella },
  {
    id: "sports-gym-equipment",
    label: ITEM_CATEGORY_LABELS["sports-gym-equipment"],
    icon: Dumbbell,
  },
  { id: "documents-papers", label: ITEM_CATEGORY_LABELS["documents-papers"], icon: FileText },
  { id: "other", label: ITEM_CATEGORY_LABELS.other, icon: Package },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: LucideIcon;
}[];

export type ItemCategory =
  | (typeof ITEM_CATEGORIES)[number]["id"]
  | (string & {});

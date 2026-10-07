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

export const ITEM_CATEGORIES = [
  { id: "electronics", label: "Electronics", icon: Smartphone },
  { id: "id", label: "ID", icon: ContactRound },
  { id: "cards", label: "Cards", icon: CreditCard },
  { id: "bags", label: "Bags", icon: BriefcaseBusiness },
  { id: "wallets-purses", label: "Wallets & Purses", icon: WalletCards },
  { id: "keys", label: "Keys", icon: KeyRound },
  {
    id: "clothing-accessories",
    label: "Clothing & Accessories",
    icon: Shirt,
  },
  {
    id: "books-school-supplies",
    label: "Books & School Supplies",
    icon: BookOpen,
  },
  { id: "jewelry", label: "Jewelry", icon: Gem },
  { id: "eyewear", label: "Eyewear", icon: Glasses },
  { id: "tumblers", label: "Tumblers", icon: CupSoda },
  { id: "umbrellas", label: "Umbrellas", icon: Umbrella },
  {
    id: "sports-gym-equipment",
    label: "Sports & Gym Equipment",
    icon: Dumbbell,
  },
  { id: "documents-papers", label: "Documents & Papers", icon: FileText },
  { id: "other", label: "Other", icon: Package },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: LucideIcon;
}[];

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]["id"];

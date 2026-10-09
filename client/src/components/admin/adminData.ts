import {
  BadgeCheck,
  CheckCheck,
  FileSearch,
  Flag,
  GitCompare,
  LayoutDashboard,
  PackageCheck,
  PackageSearch,
} from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { initialItems } from "@/data/mockItems";
import type { AdminNotification, AdminSidebarItem } from "./AdminSidebar";
import type { AdminReport, AdminSection, AdminClaim } from "./types";

export const adminReports: AdminReport[] = initialItems.map((item) => ({
  id: item.id,
  title: item.title,
  type: item.type === "lost" ? "Lost" : "Found",
  image: item.image,
  category:
    ITEM_CATEGORIES.find((category) => category.id === item.category)?.label ??
    "Other",
  description: item.description,
  building: item.building || item.location,
  color: item.color ?? "",
  reportedBy: item.contactName,
  status:
    item.status === "reunited"
      ? item.type === "lost"
        ? "Returned"
        : "Claimed"
      : item.type === "lost"
        ? "Lost"
        : "Found",
  date: item.date,
}));

export const claims: AdminClaim[] = [
  {
    id: "CL-2408",
    status: "Pending" as const,
    item: "Black Backpack",
    itemId: "item-1",
    claimant: "Mika Ross",
    dateLost: "October 3, 2026",
    timeLost: "Around 2:30 PM",
    location: "Library Building",
    details:
      "The front pocket has a small keychain shaped like a blue star. A physics notebook is inside.",
    submitted: "Today, 9:42 AM",
  },
  {
    id: "CL-2407",
    status: "Pending" as const,
    item: "Wallet",
    itemId: "item-4",
    claimant: "Janelle Cruz",
    dateLost: "October 1, 2026",
    timeLost: "Around 11:00 AM",
    location: "Main Gate",
    details:
      "Brown leather wallet with a folded library receipt behind the student ID.",
    submitted: "Today, 8:15 AM",
  },
  {
    id: "CL-2406",
    status: "Under review" as const,
    item: "iPhone 13",
    itemId: "item-2",
    claimant: "Alyssa Moore",
    dateLost: "October 3, 2026",
    timeLost: "Around 10:15 AM",
    location: "Library Building",
    details:
      "White iPhone 13 with a clear case. The lock screen has a photo of my dog.",
    submitted: "Today, 7:54 AM",
  },
  {
    id: "CL-2405",
    status: "Pending" as const,
    item: "Notebook",
    itemId: "item-8",
    claimant: "Rohan Patel",
    dateLost: "September 29, 2026",
    timeLost: "Around 1:00 PM",
    location: "Admin Building",
    details:
      "Blue spiral notebook with my initials written inside the front cover.",
    submitted: "October 8, 2026, 2:40 PM",
  },
  {
    id: "CL-2404",
    status: "Under review" as const,
    item: "Jacket",
    itemId: "item-10",
    claimant: "Sofia Reyes",
    dateLost: "September 28, 2026",
    timeLost: "After the afternoon program",
    location: "Auditorium",
    details: "Gray jacket with a small department logo on the left sleeve.",
    submitted: "October 8, 2026, 11:05 AM",
  },
  {
    id: "CL-2403",
    status: "Pending" as const,
    item: "Keys",
    itemId: "item-12",
    claimant: "Gabriel Santos",
    dateLost: "September 27, 2026",
    timeLost: "Around 4:30 PM",
    location: "Parking Lot",
    details:
      "Toyota car keys with a black fob and a small red tag on the key ring.",
    submitted: "October 7, 2026, 4:22 PM",
  },
  {
    id: "CL-2402",
    status: "Pending" as const,
    item: "Water Bottle",
    itemId: "item-6",
    claimant: "Noah Ibrahim",
    dateLost: "September 30, 2026",
    timeLost: "After lunch",
    location: "Cafeteria B",
    details:
      "Blue bottle with two stickers near the base and a name written underneath.",
    submitted: "October 7, 2026, 3:18 PM",
  },
];

export const initialNotifications: AdminNotification[] = claims.map(
  (claim) => ({
    id: claim.id,
    title: "Ownership claim submitted",
    description: `${claim.claimant} submitted a claim for the ${claim.item}.`,
    time: claim.submitted,
    claimId: claim.id,
    read: false,
  }),
);

export const activityHistory = [
  {
    id: "h1",
    title: "Claim request submitted",
    detail: "Mika Ross submitted a claim for the Black Backpack.",
    time: "Today, 9:42 AM",
    status: "Pending",
    icon: FileSearch,
  },
  {
    id: "h2",
    title: "Found item report added",
    detail: "A Water Bottle was reported at Cafeteria B.",
    time: "Today, 8:27 AM",
    status: "Open",
    icon: PackageCheck,
  },
  {
    id: "h3",
    title: "Possible match identified",
    detail: "A backpack report was paired with a nearby found report.",
    time: "Yesterday, 4:16 PM",
    status: "Under review",
    icon: GitCompare,
  },
  {
    id: "h4",
    title: "Report moved to review",
    detail: "The iPhone 13 report was flagged for a location check.",
    time: "October 5, 2026",
    status: "Under review",
    icon: Flag,
  },
  {
    id: "h5",
    title: "Item returned to owner",
    detail: "A verified claim was completed and the item was marked returned.",
    time: "October 4, 2026",
    status: "Returned",
    icon: CheckCheck,
  },
];

export const navigation: AdminSidebarItem<AdminSection>[] = [
  {
    id: "overview",
    label: "Dashboard",
    compactLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    id: "lost",
    label: "Lost items",
    compactLabel: "Lost",
    icon: PackageSearch,
  },
  {
    id: "found",
    label: "Found items",
    compactLabel: "Found",
    icon: PackageCheck,
  },
  { id: "claims", label: "Claims", compactLabel: "Claims", icon: BadgeCheck },
];

export const pageCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: "Operations overview",
    description: "A current view of campus lost and found activity.",
  },
  lost: {
    title: "Lost item reports",
    description: "Search and review reports for items reported lost.",
  },
  found: {
    title: "Found item reports",
    description: "Track found items and reports awaiting collection.",
  },
  claims: {
    title: "Ownership claims",
    description: "Review the details submitted to verify an item claim.",
  },
};

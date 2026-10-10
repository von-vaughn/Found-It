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
  buildingName: item.building,
  specificLocation: item.location,
  color: item.color ?? "",
  reportedBy: item.contactName,
  reporterEmail: `${(
    item.username ||
    item.contactName.toLowerCase().replace(/\s+/g, "_")
  ).toLowerCase()}@wmsu.edu.ph`,
  status:
    item.status === "reunited"
      ? item.type === "lost"
        ? "Returned"
        : "Claimed"
      : item.type === "lost"
        ? "Lost"
        : "Found",
  date: item.date,
  eventDateTime: item.dateTime,
}));

export const claims: AdminClaim[] = [
  {
    id: "CL-2408",
    status: "Pending" as const,
    item: "Black Backpack",
    itemId: "item-1",
    claimant: "Mika Ross",
    dateLost: "October 3, 2026",
    timeLost: "2:30 PM",
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
    timeLost: "11:00 AM",
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
    timeLost: "10:15 AM",
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
    timeLost: "1:00 PM",
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
    timeLost: "4:30 PM",
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
  {
    id: "CL-2401",
    status: "Under review" as const,
    item: "Prescription Glasses",
    itemId: "item-3",
    claimant: "Denise Aquino",
    dateLost: "October 2, 2026",
    timeLost: "9:00 AM",
    location: "Student Center",
    details:
      "Black rectangular frames with a small scratch on the left lens. The case has my initials on it.",
    submitted: "October 7, 2026, 10:05 AM",
  },
  {
    id: "CL-2400",
    status: "Pending" as const,
    item: "AirPods (Case)",
    itemId: "item-5",
    claimant: "Marco Villanueva",
    dateLost: "October 1, 2026",
    timeLost: "After gym class",
    location: "Gymnasium",
    details:
      "White charging case with a small dentist sticker on the lid. Only the case, the buds were in my ears.",
    submitted: "October 6, 2026, 5:47 PM",
  },
  {
    id: "CL-2399",
    status: "Pending" as const,
    item: "Laptop Charger",
    itemId: "item-7",
    claimant: "Paula Domingo",
    dateLost: "September 26, 2026",
    timeLost: "3:15 PM",
    location: "Parking Lot",
    details:
      "Black 65W charger with a frayed cable near the brick. A white label with my surname is wrapped around it.",
    submitted: "October 6, 2026, 1:20 PM",
  },
  {
    id: "CL-2398",
    status: "Under review" as const,
    item: "Calculator",
    itemId: "item-9",
    claimant: "Kevin Tan",
    dateLost: "September 25, 2026",
    timeLost: "During the morning exam",
    location: "Science Hall",
    details:
      "Black scientific calculator with a faded solar panel. My student number is written on the back cover.",
    submitted: "October 5, 2026, 8:33 AM",
  },
  {
    id: "CL-2397",
    status: "Pending" as const,
    item: "Student ID",
    itemId: "item-11",
    claimant: "Andrea Lim",
    dateLost: "September 24, 2026",
    timeLost: "12:30 PM",
    location: "Library",
    details:
      "WMSU student ID with a blue lanyard. The photo corner is slightly bent from daily use.",
    submitted: "October 4, 2026, 4:02 PM",
  },
  {
    id: "CL-2396",
    status: "Pending" as const,
    item: "Silver Watch",
    itemId: "item-13",
    claimant: "Joshua Ramos",
    dateLost: "October 4, 2026",
    timeLost: "1:45 PM",
    location: "Cafeteria",
    details:
      "I picked up a silver wristwatch with a metal strap near the drinks counter. Keeping it safe until claimed.",
    submitted: "Today, 11:20 AM",
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
    id: "items",
    label: "Items",
    compactLabel: "Items",
    icon: PackageSearch,
  },
  { id: "claims", label: "Claims", compactLabel: "Claims", icon: BadgeCheck },
];

export const pageCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: "Operations overview",
    description: "A current view of campus lost and found activity.",
  },
  items: {
    title: "Lost & found reports",
    description: "Search, filter, and review all lost and found item reports.",
  },
  claims: {
    title: "Ownership claims",
    description: "Review the details submitted to verify an item claim.",
  },
};

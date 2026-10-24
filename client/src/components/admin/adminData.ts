import {
  BadgeCheck,
  History,
  LayoutDashboard,
  ListFilter,
  PackageSearch,
  RotateCcw,
  Users,
} from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import type { Item } from "@/data/mockItems";
import type { ServerItem } from "@/services/itemService";
import type { AdminSidebarItem } from "./AdminSidebar";
import type {
  AdminReport,
  AdminSection,
  AdminClaim,
  AdminUser,
} from "./types";

export const itemToAdminReport = (item: Item): AdminReport => ({
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
  confidentialInfo: item.confidentialInfo,
});

/** Maps a backend item report (including the admin-only reporter email) to an admin row. */
export const serverItemToAdminReport = (item: ServerItem): AdminReport => ({
  id: item.id,
  title: item.name,
  type: item.reportType === "lost" ? "Lost" : "Found",
  image: item.image || item.images?.[0] || "",
  category:
    ITEM_CATEGORIES.find((category) => category.id === item.category)?.label ??
    item.category,
  description: item.description,
  building: item.building || item.location || "",
  buildingName: item.building ?? undefined,
  specificLocation: item.location ?? "",
  color: item.color ?? "",
  reportedBy: item.user.name,
  reporterEmail: item.user.email ?? "",
  status: item.reportType === "lost" ? "Lost" : "Found",
  date: item.itemDate,
  eventDateTime: item.itemTime
    ? `${item.itemDate}T${item.itemTime}`
    : undefined,
  confidentialInfo: item.importantDetails,
});

export const claims: AdminClaim[] = [
  {
    id: "CL-2410",
    status: "Pending" as const,
    item: "Wallet",
    itemId: "item-4",
    claimant: "Paolo Gutierrez",
    dateLost: "September 30, 2026",
    timeLost: "7:45 PM",
    location: "Main Gate",
    details:
      "Dark brown bifold wallet with a faded photo booth strip in the bill section. My initials are embossed on the corner.",
    submitted: "October 10, 2026, 10:15 AM",
    claimantTitle: "Wallet",
    color: "Brown",
    building: "WMSU Administration Building",
  },
  {
    id: "CL-2409",
    status: "Pending" as const,
    item: "iPhone 13",
    itemId: "item-2",
    claimant: "Daniel Cruz",
    dateLost: "October 2, 2026",
    timeLost: "4:10 PM",
    location: "Library Building",
    details:
      "Blue iPhone 13 with a cracked screen protector. The wallpaper is a beach photo and Find My shows it near the library.",
    submitted: "October 10, 2026, 8:30 AM",
    claimantTitle: "iPhone 13",
    color: "Blue",
    building: "Library",
  },
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
    submitted: "October 10, 2026, 9:42 AM",
    claimantTitle: "Black Backpack",
    color: "Black",
    building: "Library",
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
    submitted: "October 10, 2026, 8:15 AM",
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
    submitted: "October 10, 2026, 7:54 AM",
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
    submitted: "October 10, 2026, 11:20 AM",
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
  {
    id: "returns",
    label: "Return Items",
    compactLabel: "Returns",
    icon: RotateCcw,
  },
  {
    id: "users",
    label: "Users",
    compactLabel: "Users",
    icon: Users,
  },
  {
    id: "options",
    label: "Filter Options",
    compactLabel: "Options",
    icon: ListFilter,
  },
  {
    id: "audit",
    label: "Audit Logs",
    compactLabel: "Audit",
    icon: History,
  },
];

/** Sections only a super admin may reach; hidden from the sidebar and route-guarded. */
export const superAdminOnlySections: AdminSection[] = ["audit"];

export function navigationFor(
  isSuperAdmin: boolean,
): AdminSidebarItem<AdminSection>[] {
  return isSuperAdmin
    ? navigation
    : navigation.filter((item) => !superAdminOnlySections.includes(item.id));
}

export const pageCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: "Admin dashboard",
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
  returns: {
    title: "Return item requests",
    description: "Review ownership confirmations submitted by school users.",
  },
  users: {
    title: "User management",
    description: "Search, filter, and manage campus account access.",
  },
  options: {
    title: "Filter options",
    description:
      "Add category and building choices to the filters available to school users.",
  },
  audit: {
    title: "Audit logs",
    description:
      "See which admin approved or rejected each report across all claims, returns, and items.",
  },
};

/** Copy that differs when a super admin views the same section. */
export const superAdminPageCopy: Partial<
  Record<AdminSection, { title: string; description: string }>
> = {
  overview: {
    title: "Super admin dashboard",
    description:
      "Full campus oversight — every admin workflow plus staff and audit control.",
  },
  claims: {
    title: "Ownership claims",
    description:
      "Review the details submitted to verify an item claim. Decisions are audit-logged.",
  },
  returns: {
    title: "Return item requests",
    description:
      "Review ownership confirmations submitted by school users. Decisions are audit-logged.",
  },
  users: {
    title: "User management",
    description:
      "Manage campus users and admin accounts — create admins, change roles, and control access.",
  },
};

export function getPageCopy(
  section: AdminSection,
  isSuperAdmin: boolean,
): { title: string; description: string } {
  return (
    (isSuperAdmin ? superAdminPageCopy[section] : undefined) ??
    pageCopy[section]
  );
}

export const adminUsers: AdminUser[] = [
  {
    id: "USR-1042",
    name: "Vaughn Evangelista",
    email: "vaughn@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Aug 12, 2026",
    reportCount: 4,
  },
  {
    id: "USR-1038",
    name: "Mika Ross",
    email: "mika.ross@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Aug 28, 2026",
    reportCount: 2,
  },
  {
    id: "USR-1031",
    name: "Janelle Cruz",
    email: "janelle.cruz@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Sep 2, 2026",
    reportCount: 1,
  },
  {
    id: "USR-1027",
    name: "Alyssa Moore",
    email: "alyssa.moore@wmsu.edu.ph",
    role: "school_user",
    isActive: false,
    joined: "Sep 9, 2026",
    reportCount: 3,
  },
  {
    id: "USR-1022",
    name: "Rohan Patel",
    email: "rohan.patel@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Sep 15, 2026",
    reportCount: 0,
  },
  {
    id: "USR-1019",
    name: "Sofia Reyes",
    email: "sofia.reyes@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Sep 21, 2026",
    reportCount: 5,
  },
  {
    id: "USR-1014",
    name: "Gabriel Santos",
    email: "gabriel.santos@wmsu.edu.ph",
    role: "school_user",
    isActive: false,
    joined: "Sep 30, 2026",
    reportCount: 1,
  },
  {
    id: "USR-1011",
    name: "Denise Ocampo",
    email: "denise.ocampo@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 1, 2026",
    reportCount: 2,
  },
  {
    id: "USR-1009",
    name: "Marco Villanueva",
    email: "marco.villanueva@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 2, 2026",
    reportCount: 0,
  },
  {
    id: "USR-1006",
    name: "Lena Torres",
    email: "lena.torres@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 3, 2026",
    reportCount: 3,
  },
  {
    id: "USR-1004",
    name: "Paolo Gutierrez",
    email: "paolo.gutierrez@wmsu.edu.ph",
    role: "school_user",
    isActive: false,
    joined: "Oct 4, 2026",
    reportCount: 1,
  },
  {
    id: "USR-0998",
    name: "Katrina Lim",
    email: "katrina.lim@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 5, 2026",
    reportCount: 2,
  },
  {
    id: "USR-0995",
    name: "Diego Ramos",
    email: "diego.ramos@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 6, 2026",
    reportCount: 0,
  },
  {
    id: "USR-0991",
    name: "Bianca Aquino",
    email: "bianca.aquino@wmsu.edu.ph",
    role: "school_user",
    isActive: true,
    joined: "Oct 7, 2026",
    reportCount: 4,
  },
  {
    id: "USR-0988",
    name: "Rafael Mendoza",
    email: "rafael.mendoza@wmsu.edu.ph",
    role: "school_user",
    isActive: false,
    joined: "Oct 8, 2026",
    reportCount: 1,
  },
  {
    id: "USR-1007",
    name: "OSA Staff",
    email: "osa@wmsu.edu.ph",
    role: "admin",
    isActive: true,
    joined: "Jul 1, 2026",
    reportCount: 6,
  },
  {
    id: "USR-1003",
    name: "Campus Admin",
    email: "admin@wmsu.edu.ph",
    role: "admin",
    isActive: true,
    joined: "Jul 1, 2026",
    reportCount: 0,
  },
  {
    id: "USR-1001",
    name: "System Owner",
    email: "owner@wmsu.edu.ph",
    role: "super_admin",
    isActive: true,
    joined: "Jun 20, 2026",
    reportCount: 0,
  },
];

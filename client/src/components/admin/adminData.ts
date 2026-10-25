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
  receivedByOsa: false,
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
  receivedByOsa: item.receivedByOsa ?? false,
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
  status: item.isReturned
    ? "Returned"
    : item.isClaimed
      ? "Claimed"
    : item.reportType === "lost"
      ? "Lost"
      : "Found",
  date: item.itemDate,
  eventDateTime: item.itemTime
    ? `${item.itemDate}T${item.itemTime}`
    : undefined,
  confidentialInfo: item.importantDetails,
});

export const claims: AdminClaim[] = [];

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
export const superAdminOnlySections: AdminSection[] = ["options", "audit"];

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
    title: "Submitted Claims Request",
    description: "",
  },
  returns: {
    title: "Return Item",
    description: "",
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
    title: "Submitted Claims Request",
    description: "",
  },
  returns: {
    title: "Return Item",
    description: "",
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

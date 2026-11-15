import {
  BadgeCheck,
  History,
  LayoutDashboard,
  ListFilter,
  PackageSearch,
  RotateCcw,
  Users,
} from "lucide-react";
import { formatCategoryLabel } from "@/hooks/useCategories";
import type { ServerItem } from "@/services/itemService";
import type { AdminSidebarItem } from "./AdminSidebar";
import type { AdminReport, AdminSection } from "./types";

/** Maps a backend item report (including the admin-only reporter email) to an admin row. */
export const serverItemToAdminReport = (item: ServerItem): AdminReport => ({
  id: item.id,
  title: item.name,
  type: item.reportType === "lost" ? "Lost" : "Found",
  receivedByOsa: item.receivedByOsa ?? false,
  image: item.image || item.images?.[0] || "",
  category: formatCategoryLabel(item.category),
  description: item.description,
  building: item.building || item.location || "",
  buildingName: item.building ?? undefined,
  specificLocation: item.location ?? "",
  color: item.color ?? "",
  reportedBy: item.user.name,
  reporterEmail: item.user.email ?? "",
  reporterSchoolId: item.user.schoolId,
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
  flagCount: item.flagCount ?? 0,
  flags: item.flags ?? [],
});

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
export const superAdminOnlySections: AdminSection[] = [
  "users",
  "options",
  "audit",
];

export function navigationFor(
  isSuperAdmin: boolean,
): AdminSidebarItem<AdminSection>[] {
  return isSuperAdmin
    ? navigation
    : navigation.filter((item) => !superAdminOnlySections.includes(item.id));
}

export const pageCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: "Staff dashboard",
    description: "",
  },
  items: {
    title: "Lost & found reports",
    description: "",
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
    description: "",
  },
  options: {
    title: "Filter options",
    description: "",
  },
  audit: {
    title: "Audit logs",
    description: "",
  },
};

/** Copy that differs when an admin views the same section. */
export const superAdminPageCopy: Partial<
  Record<AdminSection, { title: string; description: string }>
> = {
  overview: {
    title: "Admin dashboard",
    description: "",
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
    description: "",
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


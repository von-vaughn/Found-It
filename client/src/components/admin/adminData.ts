import {
  BadgeCheck,
  Flag,
  History,
  LayoutDashboard,
  PackageSearch,
  PlusCircle,
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
  lastFinderReminderAt: item.lastFinderReminderAt ?? null,
  image: item.image || item.images?.[0] || "",
  category: formatCategoryLabel(item.category, item.customCategory),
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
  {
    id: "post",
    label: "Post Item",
    compactLabel: "Post",
    icon: PlusCircle,
  },
  {
    id: "claims",
    label: "Claims & Returns",
    compactLabel: "Requests",
    icon: BadgeCheck,
  },
  {
    id: "reported",
    label: "Reported Items",
    compactLabel: "Reported",
    icon: Flag,
  },
  {
    id: "users",
    label: "Users",
    compactLabel: "Users",
    icon: Users,
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
  post: {
    title: "Post an item lost or found",
    description: "",
  },
  claims: {
    title: "Claims & Return Requests",
    description: "",
  },
  reported: {
    title: "Reported items",
    description: "",
  },
  users: {
    title: "User management",
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
    title: "Claims & Return Requests",
    description: "",
  },
  reported: {
    title: "Reported items",
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


import {
  BadgeCheck,
  Flag,
  HandHelping,
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
  resolvedBy: item.resolvedBy?.name,
  resolvedByEmail: item.resolvedBy?.email,
  resolvedBySchoolId: item.resolvedBy?.schoolId,
  resolvedByIsWalkIn: item.resolvedBy?.isWalkIn ?? false,
  releasedBy: item.releasedBy?.name,
  releasedByRole: item.releasedBy?.role,
  releasedAt: item.releasedAt ?? null,
  status: item.isClaimed
    ? "Claimed"
    : item.isReturned
      ? "Returned"
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
  isHiddenByAccountStatus: Boolean(item.isHiddenByAccountStatus),
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
    group: "Reports",
  },
  {
    id: "post",
    label: "Post Item",
    compactLabel: "Post",
    icon: PlusCircle,
    group: "Reports",
  },
  {
    id: "reported",
    label: "Reported Items",
    compactLabel: "Reported",
    icon: Flag,
    group: "Reports",
  },
  {
    id: "claims",
    label: "Claims & Returns",
    compactLabel: "Requests",
    icon: BadgeCheck,
    group: "OSA desk",
  },
  {
    id: "walkin",
    label: "Walk-In",
    compactLabel: "Walk-In",
    icon: HandHelping,
    group: "OSA desk",
  },
  {
    id: "users",
    label: "Users",
    compactLabel: "Users",
    icon: Users,
    group: "Office",
  },
  {
    id: "audit",
    label: "Audit Logs",
    compactLabel: "Audit",
    icon: History,
    group: "Office",
  },
];

/** Sections only an admin may reach; hidden from the staff sidebar and route-guarded. */
export const adminOnlySections: AdminSection[] = [
  "users",
  "audit",
];

export function navigationFor(
  isAdmin: boolean,
): AdminSidebarItem<AdminSection>[] {
  return isAdmin
    ? navigation
    : navigation.filter((item) => !adminOnlySections.includes(item.id));
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
  walkin: {
    title: "Walk-In Claims & Returns",
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
export const adminPageCopy: Partial<
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
  walkin: {
    title: "Walk-In Claims & Returns",
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
  isAdmin: boolean,
): { title: string; description: string } {
  return (
    (isAdmin ? adminPageCopy[section] : undefined) ??
    pageCopy[section]
  );
}


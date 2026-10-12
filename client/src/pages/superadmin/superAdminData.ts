import {
  BadgeCheck,
  History,
  LayoutDashboard,
  PackageSearch,
  RotateCcw,
  Users,
} from "lucide-react";
import type { AdminSidebarItem } from "@/components/admin/AdminSidebar";
import type { SuperAdminSection } from "./types";

export const superAdminNavigation: AdminSidebarItem<SuperAdminSection>[] = [
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
    id: "audit",
    label: "Audit Logs",
    compactLabel: "Audit",
    icon: History,
  },
];

export const superAdminPageCopy: Record<
  SuperAdminSection,
  { title: string; description: string }
> = {
  overview: {
    title: "Super admin dashboard",
    description:
      "Full campus oversight — every admin workflow plus staff and audit control.",
  },
  items: {
    title: "Lost & found reports",
    description: "Search, filter, and review all lost and found item reports.",
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
    description: "Manage campus users and admin accounts — create admins, change roles, and control access.",
  },
  audit: {
    title: "Audit logs",
    description:
      "See which admin approved or rejected each report across all claims, returns, and items.",
  },
};

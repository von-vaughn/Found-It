import type { AdminSection } from "@/components/admin/types";
import { paths } from "@/routes/paths";

export const adminSectionPaths: Record<AdminSection, string> = {
  overview: paths.admin,
  items: paths.adminItems,
  post: paths.adminItemsNew,
  reported: paths.adminReported,
  claims: paths.adminClaims,
  users: paths.adminUsers,
  audit: paths.adminAudit,
};

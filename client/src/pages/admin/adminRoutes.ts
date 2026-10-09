import type { AdminSection } from "@/components/admin/types";
import { paths } from "@/routes/paths";

export const adminSectionPaths: Record<AdminSection, string> = {
  overview: paths.admin,
  items: paths.adminItems,
  claims: paths.adminClaims,
};

import type { SuperAdminSection } from "./types";
import { paths } from "@/routes/paths";

export const superAdminSectionPaths: Record<SuperAdminSection, string> = {
  overview: paths.superadmin,
  items: paths.superadminItems,
  claims: paths.superadminClaims,
  returns: paths.superadminReturns,
  users: paths.superadminUsers,
  audit: paths.superadminAudit,
};

import { useCallback } from "react";
import { useAuth } from "@/context/useAuth";
import {
  appendAuditLog,
  loadAuditLogs,
  type AuditAction,
  type AuditEntityType,
} from "@/lib/auditLog";

interface Decision {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  itemTitle: string;
  details?: string;
}

/**
 * Records admin decisions to the audit log. Only super admins write entries —
 * a plain admin's approvals and rejections are not tracked, which matches the
 * split the two separate layouts used to enforce.
 */
export function useAuditDecision() {
  const { user } = useAuth();

  return useCallback(
    (decision: Decision) => {
      if (user?.role !== "super_admin") return;
      appendAuditLog(loadAuditLogs(), {
        adminId: user.id,
        adminName: user.name,
        adminEmail: user.email,
        adminRole: "super_admin",
        ...decision,
      });
    },
    [user],
  );
}

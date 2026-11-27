import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type AuditAction =
  | "approved"
  | "rejected"
  | "claimed"
  | "returned"
  | "published"
  | "deleted"
  | "created"
  | "updated";

export type AuditEntityType =
  | "item"
  | "claim"
  | "return"
  | "user"
  | "category"
  | "building";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: "admin";
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  createdAt: string;
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await api.get<{ logs: AuditLogEntry[] }>("/audit-logs");
  return data.logs;
}

export function useAuditLogs(enabled = true) {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled,
    staleTime: 15_000,
  });
}

export function actionLabel(action: AuditAction): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function entityTypeLabel(entityType: AuditEntityType): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

export function filterAuditLogs(
  logs: AuditLogEntry[],
  options: { query: string; action: string; entityType: string },
): AuditLogEntry[] {
  const q = options.query.trim().toLowerCase();
  return logs.filter((log) => {
    if (options.action !== "All actions" && log.action !== options.action) {
      return false;
    }
    if (
      options.entityType !== "All types" &&
      options.entityType !== "All reports" &&
      entityTypeLabel(log.entityType) !== options.entityType
    ) {
      return false;
    }
    if (!q) return true;
    return [log.actorName, log.entityType, log.entityId, log.summary, log.action]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

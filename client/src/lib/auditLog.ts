import { getAccessToken } from "@/lib/api";

export type AuditAction =
  | "approved"
  | "rejected"
  | "returned"
  | "claimed"
  | "cancelled"
  | "published";
export type AuditEntityType = "claim" | "return_request" | "item";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole: "admin" | "super_admin";
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  itemTitle: string;
  details: string;
}

const STORAGE_KEY = "foundit_audit_logs_v1";

function seedAuditLogs(): AuditLogEntry[] {
  const now = Date.now();
  const h = 3_600_000;
  const d = 24 * h;
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    {
      id: "LOG-1042",
      timestamp: iso(now - 2 * h),
      adminId: "USR-1007",
      adminName: "OSA Staff",
      adminEmail: "osa@wmsu.edu.ph",
      adminRole: "admin",
      action: "approved",
      entityType: "claim",
      entityId: "CL-2406",
      itemTitle: "iPhone 13",
      details: "Verified ownership photo matched the found report ITEM-2.",
    },
    {
      id: "LOG-1041",
      timestamp: iso(now - 5 * h),
      adminId: "USR-1003",
      adminName: "Campus Admin",
      adminEmail: "admin@wmsu.edu.ph",
      adminRole: "admin",
      action: "rejected",
      entityType: "claim",
      entityId: "CL-2407",
      itemTitle: "Wallet",
      details: "Claimant could not describe the receipt inside the wallet.",
    },
    {
      id: "LOG-1040",
      timestamp: iso(now - 9 * h),
      adminId: "USR-1007",
      adminName: "OSA Staff",
      adminEmail: "osa@wmsu.edu.ph",
      adminRole: "admin",
      action: "approved",
      entityType: "return_request",
      entityId: "RT-EXAMPLE-3",
      itemTitle: "iPhone 13",
      details: "Return evidence confirmed; released to Alyssa Moore.",
    },
    {
      id: "LOG-1039",
      timestamp: iso(now - 1 * d),
      adminId: "USR-1001",
      adminName: "System Owner",
      adminEmail: "owner@wmsu.edu.ph",
      adminRole: "super_admin",
      action: "rejected",
      entityType: "return_request",
      entityId: "RT-EXAMPLE-2",
      itemTitle: "Wallet",
      details: "Evidence photo was blurry; asked claimant to re-upload.",
    },
    {
      id: "LOG-1038",
      timestamp: iso(now - 1 * d - 4 * h),
      adminId: "USR-1003",
      adminName: "Campus Admin",
      adminEmail: "admin@wmsu.edu.ph",
      adminRole: "admin",
      action: "returned",
      entityType: "claim",
      entityId: "CL-2402",
      itemTitle: "Water Bottle",
      details: "Item handed over at OSA office and marked returned.",
    },
    {
      id: "LOG-1037",
      timestamp: iso(now - 2 * d),
      adminId: "USR-1007",
      adminName: "OSA Staff",
      adminEmail: "osa@wmsu.edu.ph",
      adminRole: "admin",
      action: "claimed",
      entityType: "claim",
      entityId: "CL-2396",
      itemTitle: "Silver Watch",
      details: "Claimant picked up the watch after ID verification.",
    },
    {
      id: "LOG-1036",
      timestamp: iso(now - 2 * d - 6 * h),
      adminId: "USR-1001",
      adminName: "System Owner",
      adminEmail: "owner@wmsu.edu.ph",
      adminRole: "super_admin",
      action: "approved",
      entityType: "item",
      entityId: "item-1",
      itemTitle: "Black Backpack",
      details: "Found report verified and published to browse.",
    },
    {
      id: "LOG-1035",
      timestamp: iso(now - 3 * d),
      adminId: "USR-1003",
      adminName: "Campus Admin",
      adminEmail: "admin@wmsu.edu.ph",
      adminRole: "admin",
      action: "rejected",
      entityType: "item",
      entityId: "item-9",
      itemTitle: "Calculator",
      details: "Duplicate of an existing report; merged threads.",
    },
    {
      id: "LOG-1034",
      timestamp: iso(now - 4 * d),
      adminId: "USR-1007",
      adminName: "OSA Staff",
      adminEmail: "osa@wmsu.edu.ph",
      adminRole: "admin",
      action: "approved",
      entityType: "claim",
      entityId: "CL-2401",
      itemTitle: "Prescription Glasses",
      details: "Prescription details matched the intake notes.",
    },
    {
      id: "LOG-1033",
      timestamp: iso(now - 5 * d),
      adminId: "USR-1001",
      adminName: "System Owner",
      adminEmail: "owner@wmsu.edu.ph",
      adminRole: "super_admin",
      action: "rejected",
      entityType: "claim",
      entityId: "CL-2399",
      itemTitle: "Laptop Charger",
      details: "Serial sticker in evidence did not match.",
    },
  ];
}

function readStored(): AuditLogEntry[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditLogEntry[]) : null;
  } catch {
    return null;
  }
}

export function loadAuditLogs(): AuditLogEntry[] {
  const stored = readStored();
  if (stored) return stored;
  const seed = seedAuditLogs();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    /* storage unavailable — return seed only */
  }
  return seed;
}

export function persistAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch {
    /* ignore quota errors */
  }
}

export interface LogDecisionInput {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole: "admin" | "super_admin";
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  itemTitle: string;
  details?: string;
}

export function appendAuditLog(
  current: AuditLogEntry[],
  input: LogDecisionInput,
): AuditLogEntry[] {
  const entry: AuditLogEntry = {
    id: `LOG-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toISOString(),
    adminId: input.adminId,
    adminName: input.adminName,
    adminEmail: input.adminEmail,
    adminRole: input.adminRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    itemTitle: input.itemTitle,
    details: input.details ?? "",
  };
  const next = [entry, ...current].slice(0, 500);
  persistAuditLogs(next);
  // Best-effort: also report to the backend audit API when configured.
  void postAuditToServer(input).catch(() => undefined);
  return next;
}

async function postAuditToServer(input: LogDecisionInput): Promise<void> {
  const baseUrl =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_API_URL ?? "";
  const token = getAccessToken();
  if (!baseUrl || !token) return;
  await fetch(`${baseUrl.replace(/\/$/, "")}/api/audit-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: input.action === "claimed" ? "claimed" : input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityTitle: input.itemTitle,
      details:
        input.details ??
        `${input.adminName} ${input.action} ${input.entityType} ${input.entityId}`,
    }),
  });
}

export function actionLabel(action: AuditAction): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function entityTypeLabel(entityType: AuditEntityType): string {
  if (entityType === "return_request") return "Return";
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

/** Filter helper shared by the audit page + overview preview. */
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
      options.entityType !== "All reports" &&
      entityTypeLabel(log.entityType) !== options.entityType
    ) {
      return false;
    }
    if (!q) return true;
    return [log.adminName, log.adminEmail, log.entityId, log.itemTitle, log.details]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

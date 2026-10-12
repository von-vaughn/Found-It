import { useNavigate } from "react-router-dom";
import { Overview } from "@/components/admin/Overview";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminUsers } from "@/components/admin/adminData";
import type { SuperAdminSection } from "./types";
import { SuperAdminLayout } from "./SuperAdminLayout";
import { superAdminSectionPaths } from "./superAdminRoutes";
import { useSelectedReport } from "./useSelectedReport";
import { actionLabel, loadAuditLogs } from "@/lib/auditLog";

export function SuperAdminOverviewPage() {
  const navigate = useNavigate();
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const handleNavigate = (section: SuperAdminSection) => {
    navigate(superAdminSectionPaths[section]);
  };

  const staffCount = adminUsers.filter((u) => u.role !== "school_user").length;
  const recentLogs = loadAuditLogs().slice(0, 5);

  return (
    <SuperAdminLayout activeSection="overview">
      <Overview onNavigate={handleNavigate} />

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <Panel
          title="Admin accounts"
          action={
            <button
              type="button"
              onClick={() => navigate(`${superAdminSectionPaths.users}?tab=admins`)}
              className="h-8 rounded-lg bg-neutral-900 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              Manage admins
            </button>
          }
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-2xl font-extrabold tabular-nums text-neutral-900">
                {staffCount}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Active staff with admin or super admin access.
              </p>
            </div>
            <StatusBadge status="super_admin" />
          </div>
        </Panel>

        <Panel
          title="Recent decisions"
          action={
            <button
              type="button"
              onClick={() => handleNavigate("audit")}
              className="h-8 rounded-lg border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View audit logs
            </button>
          }
        >
          {recentLogs.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-neutral-500">
              No decisions recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-neutral-900">
                      {log.itemTitle} · {log.entityId}
                    </span>
                    <span className="mt-0.5 block truncate text-neutral-500">
                      {log.adminName} ({log.adminEmail})
                    </span>
                  </span>
                  <StatusBadge status={actionLabel(log.action)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {selectedReport && (
        <ItemDetailsDialog
          key={selectedReport.id}
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </SuperAdminLayout>
  );
}

export default SuperAdminOverviewPage;

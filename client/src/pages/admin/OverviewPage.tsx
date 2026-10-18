import { useNavigate } from "react-router-dom";
import { Overview } from "@/components/admin/Overview";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminUsers } from "@/components/admin/adminData";
import type { AdminSection } from "@/components/admin/types";
import { useAuth } from "@/context/useAuth";
import { AdminLayout } from "./AdminLayout";
import { adminSectionPaths } from "./sectionPaths";
import { useSelectedReport } from "@/components/admin/useSelectedReport";
import { actionLabel, loadAuditLogs } from "@/lib/auditLog";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";

export function OverviewPage({
  items,
  returnRequests,
}: {
  items: Item[];
  returnRequests: ReturnItemRequest[];
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const handleNavigate = (section: AdminSection) => {
    navigate(adminSectionPaths[section]);
  };

  const recentLogs = isSuperAdmin ? loadAuditLogs().slice(0, 5) : [];

  return (
    <AdminLayout activeSection="overview">
      <Overview
        items={items}
        returnRequests={returnRequests}
        onNavigate={handleNavigate}
      />

      {isSuperAdmin && (
        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
          <Panel
            title="Admin accounts"
            action={
              <button
                type="button"
                onClick={() =>
                  navigate(`${adminSectionPaths.users}?tab=admins`)
                }
                className="h-8 rounded-lg bg-neutral-900 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                Manage admins
              </button>
            }
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {adminUsers.filter((u) => u.role !== "school_user").length}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
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
                className="h-8 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                View audit logs
              </button>
            }
          >
            {recentLogs.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No decisions recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-neutral-900 dark:text-neutral-100">
                        {log.itemTitle} · {log.entityId}
                      </span>
                      <span className="mt-0.5 block truncate text-neutral-500 dark:text-neutral-400">
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
      )}

      {selectedReport && (
        <ItemDetailsDialog
          key={selectedReport.id}
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AdminLayout>
  );
}

export default OverviewPage;

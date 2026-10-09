import { useMemo, useState } from "react";
import { ItemTable } from "@/components/admin/ItemTable";
import { Panel } from "@/components/admin/Panel";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import { adminReports } from "@/components/admin/adminData";
import { AdminLayout } from "./AdminLayout";
import { useSelectedReport } from "./useSelectedReport";

function filterReports(query: string, type: "Lost" | "Found") {
  const normalized = query.trim().toLowerCase();
  return adminReports.filter((report) => {
    if (report.type !== type) return false;
    if (!normalized) return true;
    return [
      report.title,
      report.description,
      report.category,
      report.building,
      report.color,
      report.reportedBy,
      report.id,
    ].some((value) => value.toLowerCase().includes(normalized));
  });
}

export function FoundReportsPage() {
  const [query, setQuery] = useState("");
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const rows = useMemo(() => filterReports(query, "Found"), [query]);

  return (
    <AdminLayout
      activeSection="found"
      showSearch
      query={query}
      onQueryChange={setQuery}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">{rows.length} reports</p>
      </div>
      <Panel title="Found reports">
        <ItemTable
          rows={rows}
          onViewDetails={setSelectedReport}
          wholeRowClickable
        />
      </Panel>
      {selectedReport && (
        <ItemDetailsDialog
          report={selectedReport}
          dialogRef={dialogRef}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AdminLayout>
  );
}

export default FoundReportsPage;

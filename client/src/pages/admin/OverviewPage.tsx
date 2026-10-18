import { useNavigate } from "react-router-dom";
import { Overview } from "@/components/admin/Overview";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import type { AdminSection } from "@/components/admin/types";
import { AdminLayout } from "./AdminLayout";
import { adminSectionPaths } from "./sectionPaths";
import { useSelectedReport } from "@/components/admin/useSelectedReport";
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
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const handleNavigate = (section: AdminSection) => {
    navigate(adminSectionPaths[section]);
  };

  return (
    <AdminLayout activeSection="overview">
      <Overview
        items={items}
        returnRequests={returnRequests}
        onNavigate={handleNavigate}
      />
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

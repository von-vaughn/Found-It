import { useNavigate } from "react-router-dom";
import { Overview } from "@/components/admin/Overview";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import type { AdminSection } from "@/components/admin/types";
import { AdminLayout } from "./AdminLayout";
import { adminSectionPaths } from "./adminRoutes";
import { useSelectedReport } from "./useSelectedReport";

export function OverviewPage() {
  const navigate = useNavigate();
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();

  const handleNavigate = (section: AdminSection) => {
    navigate(adminSectionPaths[section]);
  };

  return (
    <AdminLayout activeSection="overview">
      <Overview
        onNavigate={handleNavigate}
        onViewReport={setSelectedReport}
        onSelectClaim={(id) => navigate(`/admin/claims?claimId=${id}`)}
      />
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

export default OverviewPage;

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Overview } from "@/components/admin/Overview";
import { serverItemToAdminReport } from "@/components/admin/adminData";
import { ItemDetailsDialog } from "@/components/admin/ItemDetailsDialog";
import type { AdminSection } from "@/components/admin/types";
import { useItems } from "@/hooks/useItems";
import { useAdminClaims } from "@/hooks/useClaims";
import { useAdminReturns } from "@/hooks/useReturns";
import { toClaimRequests, toFoundReportClaims } from "@/lib/claimAdapter";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { adminSectionPaths } from "./sectionPaths";
import { useSelectedReport } from "@/components/admin/useSelectedReport";

export function OverviewPage() {
  const navigate = useNavigate();
  const { selectedReport, setSelectedReport, dialogRef } =
    useSelectedReport();
  const { data: serverItems = [] } = useItems();
  const { data: serverClaims = [] } = useAdminClaims();
  const { data: serverReturns = [] } = useAdminReturns();

  const reports = useMemo(
    () => serverItems.map(serverItemToAdminReport),
    [serverItems],
  );
  const claims = useMemo(
    () => toClaimRequests(serverClaims),
    [serverClaims],
  );
  const returnRequests = useMemo(
    () => toFoundReportClaims(serverReturns),
    [serverReturns],
  );

  const handleNavigate = (section: AdminSection | "returns") => {
    if (section === "returns") {
      navigate(`${paths.adminClaims}?tab=returns`);
      return;
    }
    navigate(adminSectionPaths[section]);
  };

  return (
    <AdminLayout activeSection="overview">
      <Overview
        reports={reports}
        claims={claims}
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

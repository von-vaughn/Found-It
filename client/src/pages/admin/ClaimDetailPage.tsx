import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FadeIn } from "@/components/FadeIn";
import { ClaimDetailPanel } from "@/components/admin/ClaimsView";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useFoundClaimsWorkflow } from "./useFoundClaimsWorkflow";

export function ClaimDetailPage() {
  const { claimId = "" } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const {
    allClaims,
    foundItemClaims,
    reports,
    isLoading,
    isError,
    refetch,
    handleClaimStatusChange,
    handleOsaReceiptChange,
    isUpdatingOsaReceipt,
    handleRemindFinder,
    isRemindingFinder,
  } = useFoundClaimsWorkflow();

  const selectedClaim =
    foundItemClaims.find((claim) => claim.id === claimId) ??
    allClaims.find((claim) => claim.id === claimId) ??
    null;

  const siblingClaims = selectedClaim
    ? foundItemClaims.filter(
        (claim) =>
          claim.itemId === selectedClaim.itemId &&
          claim.id !== selectedClaim.id,
      )
    : [];

  const backButton = (
    <FadeIn y={4}>
    <button
      type="button"
      onClick={() => navigate(paths.adminClaims)}
      className="-ml-3 mb-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to claims
    </button>
    </FadeIn>
  );

  if (isLoading) {
    return (
      <AdminLayout activeSection="claims">
        {backButton}
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Loading claim request…
        </p>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout activeSection="claims">
        {backButton}
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Could not load this claim request.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex h-9 items-center rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!selectedClaim) {
    return (
      <AdminLayout activeSection="claims">
        {backButton}
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Claim request not found.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="claims">
      {backButton}
      <ClaimDetailPanel
        claim={selectedClaim}
        siblingClaims={siblingClaims}
        allClaims={allClaims}
        reports={reports}
        onClaimStatusChange={async (id, status, reason, instructions) => {
          await handleClaimStatusChange(id, status, reason, instructions);
          if (status === "Claimed" || status === "Returned") {
            navigate(paths.adminClaims, { replace: true });
          }
        }}
        onOsaReceiptChange={handleOsaReceiptChange}
        isUpdatingOsaReceipt={isUpdatingOsaReceipt}
        onRemindFinder={handleRemindFinder}
        isRemindingFinder={isRemindingFinder}
        plainDetails
      />
    </AdminLayout>
  );
}

export default ClaimDetailPage;

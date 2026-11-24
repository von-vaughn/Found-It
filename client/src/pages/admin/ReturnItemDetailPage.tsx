import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FadeIn } from "@/components/FadeIn";
import { ReturnDetailPanel } from "@/components/admin/ReturnsView";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";
import { useAdminReturnsWorkflow } from "./useAdminReturnsWorkflow";

export function ReturnItemDetailPage() {
  const { returnId = "" } = useParams<{ returnId: string }>();
  const navigate = useNavigate();
  const {
    requests,
    visibleRequests,
    reports,
    isLoading,
    isError,
    refetch,
    physicalItemReceived,
    updateReturnStatus,
    updateOsaReceipt,
    publishRejected,
  } = useAdminReturnsWorkflow();

  const selectedRequest =
    visibleRequests.find((request) => request.id === returnId) ??
    requests.find((request) => request.id === returnId) ??
    null;

  const siblingRequests = selectedRequest
    ? requests.filter(
        (request) =>
          request.itemId === selectedRequest.itemId &&
          request.id !== selectedRequest.id,
      )
    : [];

  const backButton = (
    <FadeIn y={4}>
    <button
      type="button"
      onClick={() => navigate(paths.adminReturns)}
      className="-ml-3 mb-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to return items
    </button>
    </FadeIn>
  );

  if (isLoading) {
    return (
      <AdminLayout activeSection="returns">
        {backButton}
        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Loading return request…
        </p>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout activeSection="returns">
        {backButton}
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Could not load this return request.
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

  if (!selectedRequest) {
    return (
      <AdminLayout activeSection="returns">
        {backButton}
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Return request not found.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="returns">
      {backButton}
      <ReturnDetailPanel
        request={selectedRequest}
        siblingRequests={siblingRequests}
        allRequests={requests}
        reports={reports}
        physicalItemReceived={physicalItemReceived}
        onUpdateStatus={(id, status) =>
          updateReturnStatus.mutateAsync({ id, status })
        }
        onUpdateOsaReceipt={(params, options) =>
          updateOsaReceipt.mutate(params, options)
        }
        isUpdatingOsaReceipt={updateOsaReceipt.isPending}
        updatingOsaId={updateOsaReceipt.variables?.id}
        onPublishRejected={(id, options) =>
          publishRejected.mutate(id, options)
        }
        isPublishing={publishRejected.isPending}
        publishingId={publishRejected.variables}
      />
    </AdminLayout>
  );
}

export default ReturnItemDetailPage;

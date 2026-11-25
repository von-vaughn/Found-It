import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface OsaReceiptConfirmModalProps {
  open: boolean;
  itemName: string;
  nextReceived: boolean;
  context?: "claim" | "return" | "item";
  isUpdating?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OsaReceiptConfirmModal({
  open,
  itemName,
  nextReceived,
  context = "item",
  isUpdating = false,
  onCancel,
  onConfirm,
}: OsaReceiptConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  const title = nextReceived
    ? "Mark physical item as received?"
    : "Mark physical item as not yet received?";

  const description = nextReceived
    ? context === "return"
      ? `Confirm that "${itemName}" has been physically surrendered to the OSA office. Once marked received, the finder can no longer edit or delete this return request and it can be approved.`
      : `Confirm that "${itemName}" has been physically surrendered to the OSA office. Once marked received, pending claims on this item can be approved.`
    : `Confirm that "${itemName}" should be marked as not yet received by OSA. Approval will remain unavailable until the physical item is received.`;

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="osa-receipt-confirm-title"
      aria-describedby="osa-receipt-confirm-description"
      onCancel={(event) => {
        if (isUpdating) {
          event.preventDefault();
          return;
        }
        onCancel();
      }}
      onClose={onCancel}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="relative p-6">
        <button
          type="button"
          disabled={isUpdating}
          onClick={onCancel}
          aria-label="Close confirmation"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-45 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2
          id="osa-receipt-confirm-title"
          className="pr-8 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {title}
        </h2>
        <p
          id="osa-receipt-confirm-description"
          className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
        >
          {description}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isUpdating}
            onClick={onCancel}
            className="h-10 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-45 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={onConfirm}
            className={`h-10 rounded-xl px-5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
              nextReceived
                ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700"
                : "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600"
            }`}
          >
            {isUpdating
              ? "Updating…"
              : nextReceived
                ? "Mark received"
                : "Mark not yet received"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useFlagItem } from "@/hooks/useItems";

export interface ReportPostDialogProps {
  itemId: string;
  itemTitle: string;
  open: boolean;
  onClose: () => void;
}

function ReportPostDialogContent({
  itemId,
  itemTitle,
  onClose,
}: Omit<ReportPostDialogProps, "open">) {
  const [reason, setReason] = useState("");
  const flagMutation = useFlagItem();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !flagMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flagMutation.isPending, onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Please enter at least 5 characters explaining the issue.");
      return;
    }
    flagMutation.mutate(
      { id: itemId, reason: trimmed },
      {
        onSuccess: () => {
          onClose();
          toast.success("Post reported to staff");
        },
        onError: (err) => {
          const data = (
            err as {
              response?: {
                data?: {
                  message?: string;
                  errors?: Array<{ message?: string }>;
                };
              };
            }
          )?.response?.data;
          const message = data?.errors?.[0]?.message ?? data?.message;
          toast.error(message ?? "Could not report this post.");
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !flagMutation.isPending) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`flag-post-title-${itemId}`}
        className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 p-6"
      >
        <h2
          id={`flag-post-title-${itemId}`}
          className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Report this post
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 break-words">
          Tell OSA staff what is wrong with &ldquo;{itemTitle}&rdquo;.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`flag-reason-${itemId}`}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Reason
            </label>
            <textarea
              id={`flag-reason-${itemId}`}
              rows={3}
              maxLength={500}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g., Duplicate post, inappropriate photo, or false report"
              className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-[#E5192D] focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={flagMutation.isPending}
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={flagMutation.isPending || reason.trim().length < 5}
              className="h-10 px-4 rounded-xl bg-[#E5192D] text-white text-xs font-bold transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {flagMutation.isPending ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Shared post-reporting modal calling POST /api/items/:id/flag via useFlagItem. */
export function ReportPostDialog({
  itemId,
  itemTitle,
  open,
  onClose,
}: ReportPostDialogProps) {
  if (!open) return null;
  return createPortal(
    <ReportPostDialogContent
      key={itemId}
      itemId={itemId}
      itemTitle={itemTitle}
      onClose={onClose}
    />,
    document.body,
  );
}

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { NewClaimRequest } from "@/types/claim";
import { OwnershipClaimForm } from "./OwnershipClaimForm";

interface OwnershipClaimModalProps {
  itemId: string;
  itemTitle: string;
  claimant: string;
  onClose: () => void;
  onSubmitClaim: (claim: NewClaimRequest) => void;
}

export const OwnershipClaimModal: React.FC<OwnershipClaimModalProps> = ({
  itemId,
  itemTitle,
  claimant,
  onClose,
  onSubmitClaim,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ownership-claim-title"
        aria-describedby="ownership-claim-description"
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="ownership-claim-title"
              className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Submit Claim Request
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close ownership claim form"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="[&>p:first-child]:mt-1">
          <OwnershipClaimForm
            itemId={itemId}
            itemTitle={itemTitle}
            claimant={claimant}
            onSubmitClaim={onSubmitClaim}
            onSubmitted={onClose}
            onCancel={onClose}
          />
        </div>
      </section>
    </div>
  );
};

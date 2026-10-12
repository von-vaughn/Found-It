import React, { useEffect } from "react";
import { X } from "lucide-react";
import type { Item } from "@/data/mockItems";
import { CreatePostForm } from "./CreatePostForm";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  initialType?: "lost" | "found";
  initialItem?: Item | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  onUpdateItem,
  initialType = "lost",
  initialItem = null,
}) => {
  const isEditing = initialItem !== null;

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 my-8 p-6 sm:p-7"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
              <h3
                id="report-modal-title"
                className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight text-balance"
              >
                {isEditing ? "Edit your report" : "Post an item lost or found"}
              </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report form"
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <CreatePostForm
          active={isOpen}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onSubmitted={onClose}
          initialType={initialType}
          initialItem={initialItem}
        />
      </div>
    </div>
  );
};

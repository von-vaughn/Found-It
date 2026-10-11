import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/data/mockItems";
import type { ItemFilters } from "@/components/school_user/itemFilters";
import { FilterPaletteBody } from "./FilterPaletteBody";

export interface SearchPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSubmitSearch?: (query: string) => void;
  items?: Item[];
  filters?: ItemFilters;
  onFiltersChange?: (filters: ItemFilters) => void;
  onClearFilters?: () => void;
  filterResultCount?: number;
}

export const SearchPaletteModal: React.FC<SearchPaletteModalProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  onSubmitSearch,
  items,
  filters,
  onFiltersChange,
  onClearFilters,
  filterResultCount,
}) => {
  // Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container (White Theme) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Browse categories, buildings, and filters"
            className="relative w-full max-w-2xl bg-white border border-neutral-200/90 rounded-3xl shadow-2xl shadow-neutral-950/15 flex flex-col overflow-hidden text-neutral-900 z-10 h-[490px] max-h-[85vh]"
          >
            <FilterPaletteBody
              variant="modal"
              active={isOpen}
              onClose={onClose}
              initialQuery={initialQuery}
              onSubmitSearch={onSubmitSearch}
              items={items}
              filters={filters}
              onFiltersChange={onFiltersChange}
              onClearFilters={onClearFilters}
              filterResultCount={filterResultCount}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

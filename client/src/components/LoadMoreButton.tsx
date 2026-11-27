import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  label = "Load more",
  compact = false,
  className = "",
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div
      className={`flex justify-center ${compact ? "py-3" : "py-5"} ${className}`}
    >
      <button
        type="button"
        disabled={isLoading}
        onClick={onLoadMore}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-offset-neutral-950 ${
          compact ? "h-9 px-4 text-xs" : "h-10 px-5 text-sm"
        }`}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isLoading ? "Loading…" : label}
      </button>
    </div>
  );
}

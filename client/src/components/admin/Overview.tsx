import {
  BadgeCheck,
  PackageCheck,
  PackageSearch,
  RotateCcw,
} from "lucide-react";
import { AnalyticsSection } from "./AnalyticsSection";
import { claims, itemToAdminReport } from "./adminData";
import type { AdminSection } from "./types";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";
import { useMemo } from "react";

export function Overview({
  items,
  returnRequests,
  onNavigate,
}: {
  items: Item[];
  returnRequests: ReturnItemRequest[];
  onNavigate: (section: AdminSection) => void;
}) {
  const reports = useMemo(() => items.map(itemToAdminReport), [items]);
  const lostCount = reports.filter((item) => item.type === "Lost").length;
  const foundCount = reports.filter((item) => item.type === "Found").length;
  const pendingCount = claims.length;
  const returnCount = returnRequests.length;
  const metrics = [
    {
      label: "Lost reports",
      value: lostCount,
      note: "Across all statuses",
      icon: PackageSearch,
      section: "items" as const,
    },
    {
      label: "Found reports",
      value: foundCount,
      note: "Reports on file",
      icon: PackageCheck,
      section: "items" as const,
    },
    {
      label: "Claims to review",
      value: pendingCount,
      note: "Ownership requests",
      icon: BadgeCheck,
      section: "claims" as const,
    },
    {
      label: "Return requests",
      value: returnCount,
      note: "Items to hand over",
      icon: RotateCcw,
      section: "returns" as const,
    },
  ];
  return (
    <>
      <section
        aria-label="Report totals"
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, note, icon: Icon, section }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(section)}
            className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 p-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] last:border-b-0 [&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:p-4 xl:last:border-r-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-white dark:group-hover:bg-neutral-900 dark:group-hover:bg-neutral-900">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                  {value}
                </span>
                <span className="truncate text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 sm:text-[11px]">
                  {label}
                </span>
              </span>
 <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                {note}
              </span>
            </span>
          </button>
        ))}
      </section>

      <AnalyticsSection
        items={items}
        returnRequests={returnRequests}
        onNavigate={onNavigate}
      />
    </>
  );
}

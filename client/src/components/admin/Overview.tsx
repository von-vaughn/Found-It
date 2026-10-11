import {
  BadgeCheck,
  PackageCheck,
  PackageSearch,
  RotateCcw,
} from "lucide-react";
import { AnalyticsSection } from "./AnalyticsSection";
import { adminReports, claims, initialReturnRequests } from "./adminData";
import type { AdminSection } from "./types";

export function Overview({
  onNavigate,
}: {
  onNavigate: (section: AdminSection) => void;
}) {
  const lostCount = adminReports.filter((item) => item.type === "Lost").length;
  const foundCount = adminReports.filter(
    (item) => item.type === "Found",
  ).length;
  const pendingCount = claims.length;
  const returnCount = initialReturnRequests.length;
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
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white xl:grid-cols-4"
      >
        {metrics.map(({ label, value, note, icon: Icon, section }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(section)}
            className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] last:border-b-0 [&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:p-4 xl:last:border-r-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 group-hover:bg-white">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900">
                  {value}
                </span>
                <span className="truncate text-[10px] font-semibold text-neutral-600 sm:text-[11px]">
                  {label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-neutral-500">
                {note}
              </span>
            </span>
          </button>
        ))}
      </section>

      <AnalyticsSection />
    </>
  );
}

import { useMemo } from "react";
import {
  BadgeCheck,
  Clock,
  Flag,
  Package,
  PackageCheck,
  PackageSearch,
  RotateCcw,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import type { ClaimRequest } from "@/types/claim";
import { AnalyticsSection } from "./AnalyticsSection";
import { computeDashboardSummary } from "./dashboardAnalytics";
import type { AdminReport, AdminSection } from "./types";

export function Overview({
  reports,
  claims,
  returnRequests,
  isSuperAdmin = false,
  onNavigate,
}: {
  reports: AdminReport[];
  claims: ClaimRequest[];
  returnRequests: ClaimRequest[];
  isSuperAdmin?: boolean;
  onNavigate: (section: AdminSection | "returns") => void;
}) {
  const summary = useMemo(
    () => computeDashboardSummary(reports, claims, returnRequests),
    [reports, claims, returnRequests],
  );

  const primaryMetrics = [
    {
      label: "Lost reports",
      value: String(summary.lostCount),
      note: "Across all statuses",
      icon: PackageSearch,
      section: "items" as const,
    },
    {
      label: "Found reports",
      value: String(summary.foundCount),
      note: "Reports on file",
      icon: PackageCheck,
      section: "items" as const,
    },
    {
      label: "Claims to review",
      value: String(summary.pendingClaimsCount),
      note: "Pending ownership requests",
      icon: BadgeCheck,
      section: "claims" as const,
    },
    {
      label: "Return requests",
      value: String(summary.pendingReturnsCount),
      note: "Pending handovers",
      icon: RotateCcw,
      section: "returns" as const,
    },
  ];

  const recoveryMetrics = [
    {
      label: "Recovery rate",
      value: `${summary.recoveryRate}%`,
      note: `${summary.resolvedCount} of ${reports.length} resolved`,
      icon: TrendingUp,
      section: "items" as const,
    },
    {
      label: "Unclaimed found",
      value: String(summary.unclaimedFoundCount),
      note: `${summary.unclaimedInOsaCount} at OSA · ${summary.unclaimedWithFinderCount} with finder`,
      icon: Package,
      section: "items" as const,
    },
    {
      label: "Awaiting pickup",
      value: String(summary.awaitingPickupCount),
      note: `${summary.approvedClaimsCount} claims · ${summary.approvedReturnsCount} returns`,
      icon: Clock,
      section: "claims" as const,
    },
    {
      label: "Flagged posts",
      value: String(summary.flaggedPostsCount),
      note:
        summary.flaggedPostsCount > 0
          ? "Needs moderation review"
          : "No active flags",
      icon: Flag,
      section: "reported" as const,
    },
  ];

  interface MetricCardItem {
    label: string;
    value: string;
    note: string;
    icon: LucideIcon;
    section: AdminSection | "returns";
  }

  const renderMetricStrip = (
    ariaLabel: string,
    items: MetricCardItem[],
    className?: string,
  ) => (
    <section
      aria-label={ariaLabel}
      className={`grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 xl:grid-cols-4 ${className ?? ""}`}
    >
      {items.map(({ label, value, note, icon: Icon, section }) => (
        <button
          key={label}
          type="button"
          onClick={() => onNavigate(section)}
          className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 p-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] last:border-b-0 [&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:p-4 xl:last:border-r-0"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-white dark:group-hover:bg-neutral-900">
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
            <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">
              {note}
            </span>
          </span>
        </button>
      ))}
    </section>
  );

  return (
    <>
      <FadeIn delay={0.04}>
        {renderMetricStrip("Report totals", primaryMetrics)}
        {renderMetricStrip(
          "Recovery and resolution metrics",
          recoveryMetrics,
          "mt-3",
        )}
      </FadeIn>

      <AnalyticsSection
        reports={reports}
        claims={claims}
        returnRequests={returnRequests}
        summary={summary}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}

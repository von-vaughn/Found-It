import { useMemo } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import type { ClaimRequest } from "@/types/claim";
import { AnalyticsSection } from "./AnalyticsSection";
import {
  buildDashboardSummaryCsv,
  computeDashboardSummary,
  computeRequestStatusFunnel,
  computeTopBuildings,
  computeTopCategories,
} from "./dashboardAnalytics";
import type { AdminReport, AdminSection } from "./types";

export function Overview({
  reports,
  claims,
  returnRequests,
  isAdmin = false,
  onNavigate,
}: {
  reports: AdminReport[];
  claims: ClaimRequest[];
  returnRequests: ClaimRequest[];
  isAdmin?: boolean;
  onNavigate: (section: AdminSection | "returns") => void;
}) {
  const summary = useMemo(
    () => computeDashboardSummary(reports, claims, returnRequests),
    [reports, claims, returnRequests],
  );
  const topCategories = useMemo(
    () => computeTopCategories(reports, 6),
    [reports],
  );
  const topBuildings = useMemo(
    () => computeTopBuildings(reports, 6),
    [reports],
  );
  const requestFunnel = useMemo(
    () => computeRequestStatusFunnel(claims, returnRequests),
    [claims, returnRequests],
  );

  const osaSharePct =
    summary.unclaimedFoundCount > 0
      ? Math.round(
          (summary.unclaimedInOsaCount / summary.unclaimedFoundCount) * 100,
        )
      : 0;

  const handleExportCsv = () => {
    const csv = buildDashboardSummaryCsv({
      summary,
      categories: topCategories,
      buildings: topBuildings,
      funnel: requestFunnel,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `foundit-dashboard-summary-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statCards: Array<{
    label: string;
    value: number;
    meta: string;
    target: AdminSection | "returns";
    dotClass?: string;
  }> = [
    {
      label: "Claims to review",
      value: summary.pendingClaimsCount,
      meta:
        summary.pendingClaimsCount === 1
          ? "Pending ownership request"
          : "Pending ownership requests",
      target: "claims",
      dotClass:
        summary.pendingClaimsCount > 0
          ? "bg-[#E5192D]"
          : "bg-neutral-300 dark:bg-neutral-700",
    },
    {
      label: "Return requests",
      value: summary.pendingReturnsCount,
      meta:
        summary.pendingReturnsCount === 1
          ? "Pending finder handover"
          : "Pending finder handovers",
      target: "returns",
      dotClass:
        summary.pendingReturnsCount > 0
          ? "bg-amber-500"
          : "bg-neutral-300 dark:bg-neutral-700",
    },
    {
      label: "Unclaimed at OSA",
      value: summary.unclaimedInOsaCount,
      meta: `${summary.unclaimedWithFinderCount} still with finder`,
      target: "items",
    },
    {
      label: "Awaiting pickup",
      value: summary.awaitingPickupCount,
      meta: `${summary.approvedClaimsCount} claims · ${summary.approvedReturnsCount} returns`,
      target: "claims",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1: Four equal-height operational KPI cards */}
      <section
          aria-label="Operational overview"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {statCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.target)}
              className="group flex flex-col justify-between rounded-2xl bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 hover:bg-neutral-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800/80"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {card.dotClass && (
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${card.dotClass}`}
                      aria-hidden="true"
                    />
                  )}
                  {card.label}
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-neutral-400 transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-100"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-6">
                <p className="text-[32px] font-medium leading-none tracking-[-0.02em] text-neutral-900 tabular-nums dark:text-neutral-100">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {card.meta}
                </p>
              </div>
            </button>
          ))}
        </section>

      {/* Row 2: OSA custody ledger bar + quick report counts + CSV export */}
      <section
          aria-label="OSA custody and report totals"
          className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 dark:shadow-none lg:flex-row lg:items-center lg:justify-between lg:px-6"
        >
          <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
            <button
              type="button"
              onClick={() => onNavigate("items")}
              className="group flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] rounded-lg"
            >
              <span className="text-xs text-neutral-500 transition-colors duration-150 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-100">
                Lost reports
              </span>
              <span className="mt-1 text-lg font-medium leading-none text-neutral-900 tabular-nums dark:text-neutral-100">
                {summary.lostCount}
              </span>
            </button>

            <span
              className="hidden h-8 w-px bg-neutral-100 dark:bg-neutral-800 sm:block"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => onNavigate("items")}
              className="group flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] rounded-lg"
            >
              <span className="text-xs text-neutral-500 transition-colors duration-150 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-100">
                Found reports
              </span>
              <span className="mt-1 text-lg font-medium leading-none text-neutral-900 tabular-nums dark:text-neutral-100">
                {summary.foundCount}
              </span>
            </button>

            <span
              className="hidden h-8 w-px bg-neutral-100 dark:bg-neutral-800 sm:block"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => onNavigate("reported")}
              className="group flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] rounded-lg"
            >
              <span className="inline-flex items-center gap-2 text-xs text-neutral-500 transition-colors duration-150 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-100">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    summary.flaggedPostsCount > 0
                      ? "bg-[#E5192D]"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                  aria-hidden="true"
                />
                Flagged posts
              </span>
              <span
                className={`mt-1 text-lg font-medium leading-none tabular-nums ${
                  summary.flaggedPostsCount > 0
                    ? "text-[#E5192D] dark:text-red-400"
                    : "text-neutral-900 dark:text-neutral-100"
                }`}
              >
                {summary.flaggedPostsCount}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between lg:border-t-0 lg:pt-0 lg:gap-6">
            <div className="w-full sm:w-56">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Physical custody at OSA
                </span>
                <span className="font-medium text-neutral-900 tabular-nums dark:text-neutral-100">
                  {osaSharePct}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                role="progressbar"
                aria-valuenow={osaSharePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Percentage of unclaimed found items in OSA custody"
              >
                <div
                  className="h-full origin-left rounded-full bg-[#E5192D] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: `scaleX(${osaSharePct / 100})` }}
                />
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <Download
                  className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Export CSV
              </button>
            )}
          </div>
        </section>

      <AnalyticsSection
        reports={reports}
        claims={claims}
        returnRequests={returnRequests}
        topCategories={topCategories}
        topBuildings={topBuildings}
        requestFunnel={requestFunnel}
      />
    </div>
  );
}

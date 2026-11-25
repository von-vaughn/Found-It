import { useMemo } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
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

  return (
    <div className="space-y-5">
      <FadeIn delay={0.03}>
        <section
          aria-label="Operational overview"
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          {/* Left: Primary queues + Report volume strip */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none lg:col-span-7">
            <div className="grid flex-1 grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-neutral-800">
              <button
                type="button"
                onClick={() => onNavigate("claims")}
                className="group flex flex-col justify-between p-5 text-left transition-colors duration-150 hover:bg-neutral-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/50 sm:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        summary.pendingClaimsCount > 0
                          ? "bg-[#E5192D]"
                          : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                      aria-hidden="true"
                    />
                    Claims to review
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-100"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-5">
                  <p className="text-3xl font-extrabold tracking-[-0.03em] text-neutral-950 tabular-nums dark:text-white sm:text-4xl">
                    {summary.pendingClaimsCount}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {summary.pendingClaimsCount === 1
                      ? "Pending ownership request"
                      : "Pending ownership requests"}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("returns")}
                className="group flex flex-col justify-between p-5 text-left transition-colors duration-150 hover:bg-neutral-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/50 sm:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        summary.pendingReturnsCount > 0
                          ? "bg-amber-500"
                          : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                      aria-hidden="true"
                    />
                    Return requests
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 text-neutral-400 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-100"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-5">
                  <p className="text-3xl font-extrabold tracking-[-0.03em] text-neutral-950 tabular-nums dark:text-white sm:text-4xl">
                    {summary.pendingReturnsCount}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {summary.pendingReturnsCount === 1
                      ? "Pending finder handover"
                      : "Pending finder handovers"}
                  </p>
                </div>
              </button>
            </div>

            {/* Bottom hairline metric bar */}
            <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-neutral-50/60 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/50">
              <button
                type="button"
                onClick={() => onNavigate("items")}
                className="group flex flex-col px-4 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/60 sm:px-5"
              >
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Lost reports
                </span>
                <span className="mt-1 text-lg font-bold tracking-tight text-neutral-900 tabular-nums dark:text-neutral-100">
                  {summary.lostCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("items")}
                className="group flex flex-col px-4 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/60 sm:px-5"
              >
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Found reports
                </span>
                <span className="mt-1 text-lg font-bold tracking-tight text-neutral-900 tabular-nums dark:text-neutral-100">
                  {summary.foundCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("reported")}
                className="group flex flex-col px-4 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] dark:hover:bg-neutral-800/60 sm:px-5"
              >
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Flagged posts
                </span>
                <span
                  className={`mt-1 text-lg font-bold tracking-tight tabular-nums ${
                    summary.flaggedPostsCount > 0
                      ? "text-[#E5192D] dark:text-red-400"
                      : "text-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {summary.flaggedPostsCount}
                </span>
              </button>
            </div>
          </div>

          {/* Right: OSA Custody & Handover Surface */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none sm:p-6 lg:col-span-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
                  OSA custody &amp; pickup
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Active found inventory and approved handovers
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[11px] font-semibold text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export CSV
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate("items")}
                className="group rounded-xl border border-neutral-100 bg-neutral-50/80 p-3.5 text-left transition-colors duration-150 hover:border-neutral-200 hover:bg-neutral-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/60"
              >
                <span className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Unclaimed found
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white"
                    aria-hidden="true"
                  />
                </span>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-950 tabular-nums dark:text-white">
                  {summary.unclaimedInOsaCount}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
                  Received by OSA · {summary.unclaimedWithFinderCount} with
                  finder
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("claims")}
                className="group rounded-xl border border-neutral-100 bg-neutral-50/80 p-3.5 text-left transition-colors duration-150 hover:border-neutral-200 hover:bg-neutral-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/60"
              >
                <span className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Awaiting pickup
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white"
                    aria-hidden="true"
                  />
                </span>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-950 tabular-nums dark:text-white">
                  {summary.awaitingPickupCount}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
                  {summary.approvedClaimsCount} claims ·{" "}
                  {summary.approvedReturnsCount} returns
                </p>
              </button>
            </div>

            {/* Proportional custody progress bar */}
            <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-neutral-500 dark:text-neutral-400">
                  Physical custody at OSA
                </span>
                <span className="font-semibold text-neutral-900 tabular-nums dark:text-white">
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
                  className="h-full rounded-full bg-[#E5192D] transition-all duration-300"
                  style={{ width: `${osaSharePct}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

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

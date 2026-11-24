import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import type { ClaimRequest } from "@/types/claim";
import { Panel } from "./Panel";
import {
  buildDashboardSummaryCsv,
  computeReportsTrend,
  computeRequestStatusFunnel,
  computeTopBuildings,
  computeTopCategories,
  type DashboardSummary,
  type RankedCount,
  type TrendRangeDays,
} from "./dashboardAnalytics";
import type { AdminReport } from "./types";

const RANGE_OPTIONS: Array<{ value: TrendRangeDays; label: string }> = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const FUNNEL_BAR_CLASS = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  red: "bg-[#E5192D]",
} as const;

const FUNNEL_DOT_CLASS = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  red: "bg-[#E5192D]",
} as const;

function RankedBarList({
  rows,
  emptyLabel,
  barClassName,
}: {
  rows: RankedCount[];
  emptyLabel: string;
  barClassName: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400 sm:px-5">
        {emptyLabel}
      </p>
    );
  }

  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <ul className="space-y-3 px-4 py-4 sm:px-5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-[11px] text-neutral-500 dark:text-neutral-400">
              <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
                {row.count}
              </strong>{" "}
              ({row.share}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barClassName}`}
              style={{
                width: `${Math.max(4, Math.round((row.count / maxCount) * 100))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsSection({
  reports,
  claims,
  returnRequests,
  summary,
  isSuperAdmin = false,
}: {
  reports: AdminReport[];
  claims: ClaimRequest[];
  returnRequests: ClaimRequest[];
  summary: DashboardSummary;
  isSuperAdmin?: boolean;
}) {
  const [rangeDays, setRangeDays] = useState<TrendRangeDays>(30);

  const trendBuckets = useMemo(
    () => computeReportsTrend(reports, rangeDays),
    [reports, rangeDays],
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

  const maxBucketTotal = Math.max(
    ...trendBuckets.map((bucket) =>
      Math.max(bucket.lost, bucket.found, bucket.resolved),
    ),
    1,
  );
  const totalRequests = claims.length + returnRequests.length;

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
    <section aria-labelledby="analytics-trends-heading" className="mt-5">
      <FadeIn delay={0.06}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="analytics-trends-heading"
            className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Analytics &amp; trends
          </h2>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export summary CSV
            </button>
          )}
        </div>
      </FadeIn>

      <div className="grid min-w-0 gap-3 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Panel
            title="Reports over time"
            className="flex h-full flex-col"
            action={
              <div
                className="inline-flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-950"
                role="group"
                aria-label="Trend time range"
              >
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRangeDays(option.value)}
                    aria-pressed={rangeDays === option.value}
                    className={`h-6 rounded-md px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                      rangeDays === option.value
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="flex flex-1 flex-col justify-between px-4 py-4 sm:px-5">
              <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-neutral-600 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  Lost
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-neutral-800 dark:bg-neutral-300" />
                  Found
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Resolved
                </span>
              </div>

              <div
                className="grid h-44 items-end gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800"
                style={{
                  gridTemplateColumns: `repeat(${trendBuckets.length}, minmax(0, 1fr))`,
                }}
              >
                {trendBuckets.map((bucket) => {
                  const heightPct = (value: number) =>
                    value === 0
                      ? 0
                      : Math.max(8, Math.round((value / maxBucketTotal) * 100));
                  return (
                    <div
                      key={bucket.key}
                      className="flex h-full flex-col items-center justify-end gap-1"
                      title={`${bucket.label}: ${bucket.lost} lost, ${bucket.found} found, ${bucket.resolved} resolved`}
                    >
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div
                          className="w-2.5 rounded-t bg-amber-500 transition-all duration-300"
                          style={{ height: `${heightPct(bucket.lost)}%` }}
                        />
                        <div
                          className="w-2.5 rounded-t bg-neutral-800 transition-all duration-300 dark:bg-neutral-300"
                          style={{ height: `${heightPct(bucket.found)}%` }}
                        />
                        <div
                          className="w-2.5 rounded-t bg-emerald-500 transition-all duration-300"
                          style={{ height: `${heightPct(bucket.resolved)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="mt-2 grid gap-2 text-center"
                style={{
                  gridTemplateColumns: `repeat(${trendBuckets.length}, minmax(0, 1fr))`,
                }}
              >
                {trendBuckets.map((bucket) => (
                  <span
                    key={bucket.key}
                    className="truncate text-[10px] font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    {bucket.label}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <Panel
            title="Request status funnel"
            className="flex h-full flex-col"
            action={
              <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                {totalRequests} total
              </span>
            }
          >
            <div className="flex flex-1 flex-col justify-between px-4 py-4 sm:px-5">
              {totalRequests === 0 ? (
                <p className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  No claim or return requests submitted yet.
                </p>
              ) : (
                <>
                  <div
                    className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                    role="img"
                    aria-label="Request status distribution"
                  >
                    {requestFunnel.map((row) =>
                      row.count > 0 ? (
                        <div
                          key={row.label}
                          className={`h-full ${FUNNEL_BAR_CLASS[row.tone]} transition-all duration-300`}
                          style={{
                            width: `${Math.max(4, Math.round((row.count / totalRequests) * 100))}%`,
                          }}
                          title={`${row.label}: ${row.count} (${row.share}%)`}
                        />
                      ) : null,
                    )}
                  </div>

                  <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {requestFunnel.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0 last:pb-0"
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-neutral-700 dark:text-neutral-300">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${FUNNEL_DOT_CLASS[row.tone]}`}
                          />
                          {row.label}
                        </span>
                        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {row.count}
                          </strong>{" "}
                          ({row.share}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
        <Panel
          title="Top categories"
          action={
            <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {reports.length} reports
            </span>
          }
        >
          <RankedBarList
            rows={topCategories}
            emptyLabel="No categorized reports yet."
            barClassName="bg-[#E5192D]"
          />
        </Panel>

        <Panel
          title="Campus hotspots"
          action={
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              By building
            </span>
          }
        >
          <RankedBarList
            rows={topBuildings}
            emptyLabel="No building locations recorded yet."
            barClassName="bg-neutral-900 dark:bg-neutral-200"
          />
        </Panel>
      </div>
    </section>
  );
}

export default AnalyticsSection;

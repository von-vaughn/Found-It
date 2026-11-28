import { useMemo, useState } from "react";
import type { ClaimRequest } from "@/types/claim";
import {
  computeMonthlyReportsTrend,
  getAvailableReportYears,
  type RankedCount,
  type StatusFunnelRow,
} from "./dashboardAnalytics";
import type { AdminReport } from "./types";

const MONTH_OPTIONS = [
  { value: "all", label: "All months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
] as const;

const FUNNEL_STYLES = {
  amber: {
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  blue: {
    bar: "bg-neutral-500 dark:bg-neutral-400",
    dot: "bg-neutral-500 dark:bg-neutral-400",
  },
  emerald: {
    bar: "bg-emerald-600 dark:bg-emerald-500",
    dot: "bg-emerald-600 dark:bg-emerald-500",
  },
  red: {
    bar: "bg-[#E5192D]",
    dot: "bg-[#E5192D]",
  },
} as const;

export function AnalyticsSection({
  reports,
  claims,
  returnRequests,
  topCategories,
  topBuildings,
  requestFunnel,
}: {
  reports: AdminReport[];
  claims: ClaimRequest[];
  returnRequests: ClaimRequest[];
  topCategories: RankedCount[];
  topBuildings: RankedCount[];
  requestFunnel: StatusFunnelRow[];
}) {
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(() =>
    new Date().getMonth(),
  );
  const [hoveredBucketKey, setHoveredBucketKey] = useState<string | null>(null);

  const availableYears = useMemo(
    () => getAvailableReportYears(reports),
    [reports],
  );
  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];

  const trendBuckets = useMemo(
    () => computeMonthlyReportsTrend(reports, effectiveYear, selectedMonth),
    [reports, effectiveYear, selectedMonth],
  );

  const activePeriodLabel =
    selectedMonth === "all"
      ? `Year ${effectiveYear}`
      : `${MONTH_OPTIONS[selectedMonth + 1]?.label ?? ""} ${effectiveYear}`;

  const periodTotals = useMemo(
    () =>
      trendBuckets.reduce(
        (acc, bucket) => ({
          lost: acc.lost + bucket.lost,
          found: acc.found + bucket.found,
        }),
        { lost: 0, found: 0 },
      ),
    [trendBuckets],
  );

  const rawMax = Math.max(
    ...trendBuckets.map((bucket) => Math.max(bucket.lost, bucket.found)),
    0,
  );
  // Round Y-axis ceiling to an even step so ticks stay clean integers.
  const yAxisMax = rawMax <= 2 ? 2 : Math.ceil(rawMax / 2) * 2;
  const yTicks = [yAxisMax, Math.round(yAxisMax / 2), 0];

  const hoveredBucket = hoveredBucketKey
    ? (trendBuckets.find((bucket) => bucket.key === hoveredBucketKey) ?? null)
    : null;

  const totalRequests = claims.length + returnRequests.length;
  const maxCategoryCount = Math.max(
    ...topCategories.map((row) => row.count),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Row 3: Primary chart (8 cols) + Request lifecycle ledger (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section
            aria-labelledby="reports-trend-heading"
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 dark:shadow-none lg:col-span-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2
                  id="reports-trend-heading"
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  Reports over time
                </h2>
                <p className="mt-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {hoveredBucket ? (
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {hoveredBucket.label} · {hoveredBucket.found} found ·{" "}
                      {hoveredBucket.lost} lost
                    </span>
                  ) : (
                    <span>
                      {activePeriodLabel} · {periodTotals.found} found ·{" "}
                      {periodTotals.lost} lost
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="trend-month-filter">
                  Filter trend by month
                </label>
                <select
                  id="trend-month-filter"
                  value={
                    selectedMonth === "all" ? "all" : String(selectedMonth)
                  }
                  onChange={(event) => {
                    const val = event.target.value;
                    setSelectedMonth(val === "all" ? "all" : Number(val));
                    setHoveredBucketKey(null);
                  }}
                  className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="trend-year-filter">
                  Filter trend by year
                </label>
                <select
                  id="trend-year-filter"
                  value={String(effectiveYear)}
                  onChange={(event) => {
                    setSelectedYear(Number(event.target.value));
                    setHoveredBucketKey(null);
                  }}
                  className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium tabular-nums text-neutral-700 transition-colors duration-150 hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Series legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#E5192D]" />
                Found
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-neutral-300 dark:bg-neutral-600" />
                Lost
              </span>
            </div>

            {/* Primary chart body (288px plot height) */}
            <div className="mt-6 flex flex-1 gap-3">
              <div
                className="flex h-72 flex-col justify-between pb-7 text-right font-mono text-xs text-neutral-400 tabular-nums dark:text-neutral-500"
                aria-hidden="true"
              >
                {yTicks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>

              <div className="relative flex flex-1 flex-col">
                <div className="relative h-72 pb-7">
                  {/* Muted horizontal gridlines */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between"
                    aria-hidden="true"
                  >
                    <div className="border-t border-neutral-100 dark:border-neutral-800" />
                    <div className="border-t border-neutral-100 dark:border-neutral-800" />
                    <div className="border-t border-neutral-200 dark:border-neutral-800" />
                  </div>

                  {/* Interactive column groups */}
                  <div
                    className="relative grid h-full items-end gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${trendBuckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {trendBuckets.map((bucket) => {
                      const isHovered = hoveredBucketKey === bucket.key;
                      const barHeight = (value: number) =>
                        value === 0
                          ? 0
                          : Math.max(4, Math.round((value / yAxisMax) * 100));
                      return (
                        <button
                          key={bucket.key}
                          type="button"
                          onMouseEnter={() => setHoveredBucketKey(bucket.key)}
                          onMouseLeave={() => setHoveredBucketKey(null)}
                          onFocus={() => setHoveredBucketKey(bucket.key)}
                          onBlur={() => setHoveredBucketKey(null)}
                          aria-label={`${bucket.label}: ${bucket.found} found, ${bucket.lost} lost`}
                          className={`group flex h-full flex-col justify-end rounded-lg px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                            isHovered
                              ? "bg-neutral-100/80 dark:bg-neutral-800/60"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                          }`}
                        >
                          <div className="flex h-full w-full items-end justify-center gap-1">
                            <span
                              className="w-3 rounded-t-[4px] bg-[#E5192D] transition-opacity duration-150 sm:w-3.5"
                              style={{ height: `${barHeight(bucket.found)}%` }}
                            />
                            <span
                              className="w-3 rounded-t-[4px] bg-neutral-300 transition-colors duration-150 dark:bg-neutral-600 sm:w-3.5"
                              style={{ height: `${barHeight(bucket.lost)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* X-axis labels */}
                  <div
                    className="mt-2 grid gap-2 text-center"
                    style={{
                      gridTemplateColumns: `repeat(${trendBuckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {trendBuckets.map((bucket) => (
                      <span
                        key={bucket.key}
                        className={`truncate font-mono text-xs transition-colors duration-150 ${
                          hoveredBucketKey === bucket.key
                            ? "text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-500 dark:text-neutral-400"
                        }`}
                      >
                        {bucket.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Request lifecycle breakdown */}
          <section
            aria-labelledby="request-funnel-heading"
            className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 dark:shadow-none lg:col-span-4"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id="request-funnel-heading"
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  Request lifecycle
                </h2>
                <span className="font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {totalRequests} total
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Claim and return outcomes
              </p>

              {totalRequests === 0 ? (
                <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center dark:border-neutral-800">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    No active requests yet
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Outcomes appear as students submit claims and returns
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="mt-6 flex h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                    role="img"
                    aria-label="Request lifecycle distribution"
                  >
                    {requestFunnel.map((row) =>
                      row.count > 0 ? (
                        <div
                          key={row.label}
                          className={`h-full ${FUNNEL_STYLES[row.tone].bar}`}
                          style={{
                            width: `${Math.max(4, Math.round((row.count / totalRequests) * 100))}%`,
                          }}
                          title={`${row.label}: ${row.count} (${row.share}%)`}
                        />
                      ) : null,
                    )}
                  </div>

                  <ul className="mt-6 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {requestFunnel.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-3 text-xs first:pt-0 last:pb-0"
                      >
                        <span className="inline-flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${FUNNEL_STYLES[row.tone].dot}`}
                            aria-hidden="true"
                          />
                          {row.label}
                        </span>
                        <span className="flex items-baseline gap-3 tabular-nums">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {row.count}
                          </span>
                          <span className="w-10 text-right font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {row.share}%
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {totalRequests > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 font-mono text-xs text-neutral-500 tabular-nums dark:border-neutral-800 dark:text-neutral-400">
                <span>Claims: {claims.length}</span>
                <span>Returns: {returnRequests.length}</span>
              </div>
            )}
          </section>
        </div>

      {/* Row 4: Asymmetric breakdown — Top categories (7 cols bars) + Campus hotspots (5 cols table) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section
            aria-labelledby="top-categories-heading"
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 dark:shadow-none lg:col-span-7"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2
                  id="top-categories-heading"
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  Top categories
                </h2>
                <p className="mt-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  Most reported item types across {reports.length} reports
                </p>
              </div>
            </div>

            {topCategories.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  No categorized reports yet
                </p>
                <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                  Category distribution appears once reports are submitted
                </p>
              </div>
            ) : (
              <ol className="mt-6 space-y-4">
                {topCategories.map((row, index) => {
                  const isLeader = index === 0;
                  return (
                    <li key={row.label}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <div className="flex min-w-0 items-baseline gap-3">
                          <span className="w-4 shrink-0 font-mono text-xs text-neutral-400 tabular-nums dark:text-neutral-500">
                            {index + 1}
                          </span>
                          <span
                            className={`truncate text-xs ${
                              isLeader
                                ? "font-medium text-neutral-900 dark:text-neutral-100"
                                : "text-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            {row.label}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-baseline gap-3 text-xs tabular-nums">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {row.count}
                          </span>
                          <span className="w-10 text-right font-mono text-neutral-500 dark:text-neutral-400">
                            {row.share}%
                          </span>
                        </div>
                      </div>
                      <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className={`h-full origin-left rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isLeader
                              ? "bg-[#E5192D]"
                              : "bg-neutral-400 dark:bg-neutral-600"
                          }`}
                          style={{
                            transform: `scaleX(${Math.max(0.04, row.count / maxCategoryCount)})`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section
            aria-labelledby="campus-hotspots-heading"
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 dark:shadow-none lg:col-span-5"
          >
            <div>
              <h2
                id="campus-hotspots-heading"
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Campus hotspots
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Buildings with the most lost and found activity
              </p>
            </div>

            {topBuildings.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  No building hotspots yet
                </p>
                <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                  Reports tagged with campus buildings rank here automatically
                </p>
              </div>
            ) : (
              <table className="mt-6 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th scope="col" className="pb-2 font-normal">
                      Building
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Reports
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {topBuildings.map((row, index) => (
                    <tr key={row.label} className="h-10">
                      <td className="max-w-[200px] truncate pr-3 text-neutral-800 dark:text-neutral-200">
                        <span className="mr-2 font-mono text-neutral-400 tabular-nums dark:text-neutral-500">
                          {index + 1}
                        </span>
                        <span className={index === 0 ? "font-medium text-neutral-900 dark:text-neutral-100" : ""}>
                          {row.label}
                        </span>
                      </td>
                      <td className="text-right font-medium text-neutral-900 tabular-nums dark:text-neutral-100">
                        {row.count}
                      </td>
                      <td className="w-14 text-right font-mono text-neutral-500 tabular-nums dark:text-neutral-400">
                        {row.share}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
    </div>
  );
}

export default AnalyticsSection;

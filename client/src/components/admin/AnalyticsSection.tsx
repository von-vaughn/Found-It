import { useMemo, useState } from "react";
import { MapPin, Tag } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
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
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  emerald: {
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  red: {
    bar: "bg-[#E5192D]",
    dot: "bg-[#E5192D]",
  },
} as const;

function RankedDistribution({
  title,
  subtitle,
  rows,
  emptyTitle,
  emptyDescription,
  accentTone,
  icon,
}: {
  title: string;
  subtitle: string;
  rows: RankedCount[];
  emptyTitle: string;
  emptyDescription: string;
  accentTone: "crimson" | "ink";
  icon: "category" | "building";
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  const Icon = icon === "category" ? Tag : MapPin;

  return (
    <section className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {emptyTitle}
          </p>
          <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-3.5">
          {rows.map((row, index) => {
            const isLeader = index === 0;
            const fillClass =
              accentTone === "crimson"
                ? isLeader
                  ? "bg-[#E5192D]"
                  : "bg-neutral-800/80 dark:bg-neutral-300/80"
                : isLeader
                  ? "bg-neutral-950 dark:bg-white"
                  : "bg-neutral-400 dark:bg-neutral-600";
            return (
              <li key={row.label} className="group">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="w-4 shrink-0 text-[11px] font-semibold text-neutral-400 tabular-nums dark:text-neutral-500">
                      {index + 1}
                    </span>
                    <span
                      className={`truncate text-xs ${
                        isLeader
                          ? "font-bold text-neutral-950 dark:text-white"
                          : "font-medium text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2 text-xs tabular-nums">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {row.count}
                    </span>
                    <span className="w-9 text-right text-[11px] text-neutral-500 dark:text-neutral-400">
                      {row.share}%
                    </span>
                  </div>
                </div>
                <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
                    style={{
                      width: `${Math.max(4, Math.round((row.count / maxCount) * 100))}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

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
  // Round Y-axis ceiling to an even step so ticks are clean integers.
  const yAxisMax = rawMax <= 2 ? 2 : Math.ceil(rawMax / 2) * 2;
  const yTicks = [yAxisMax, Math.round(yAxisMax / 2), 0];

  const hoveredBucket = hoveredBucketKey
    ? (trendBuckets.find((bucket) => bucket.key === hoveredBucketKey) ?? null)
    : null;

  const totalRequests = claims.length + returnRequests.length;

  return (
    <div className="space-y-4">
      {/* Row 1: Reports Trend (8 cols) + Request Funnel (4 cols) */}
      <FadeIn delay={0.06}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section
            aria-labelledby="reports-trend-heading"
            className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none sm:p-6 lg:col-span-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="reports-trend-heading"
                  className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white"
                >
                  Reports over time
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {hoveredBucket ? (
                    <span className="font-medium text-neutral-800 tabular-nums dark:text-neutral-200">
                      {hoveredBucket.label}: {hoveredBucket.lost} lost ·{" "}
                      {hoveredBucket.found} found
                    </span>
                  ) : (
                    <span className="tabular-nums">
                      {activePeriodLabel} · {periodTotals.lost} lost ·{" "}
                      {periodTotals.found} found
                    </span>
                  )}
                </p>
              </div>

              <div className="inline-flex flex-wrap items-center gap-1.5">
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
                  className="h-9 rounded-xl border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
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
                  className="h-9 rounded-xl border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold tabular-nums text-neutral-700 transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Lost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-neutral-900 dark:bg-neutral-200" />
                Found
              </span>
            </div>

            {/* Chart body with Y-axis scale + dashed gridlines */}
            <div className="mt-4 flex flex-1 gap-3">
              <div
                className="flex h-48 flex-col justify-between pb-6 text-right text-[10px] font-medium text-neutral-400 tabular-nums dark:text-neutral-500"
                aria-hidden="true"
              >
                {yTicks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>

              <div className="relative flex flex-1 flex-col">
                <div className="relative h-48 pb-6">
                  {/* Horizontal dashed gridlines */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between"
                    aria-hidden="true"
                  >
                    <div className="border-t border-dashed border-neutral-200/80 dark:border-neutral-800" />
                    <div className="border-t border-dashed border-neutral-200/80 dark:border-neutral-800" />
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
                          : Math.max(6, Math.round((value / yAxisMax) * 100));
                      return (
                        <button
                          key={bucket.key}
                          type="button"
                          onMouseEnter={() => setHoveredBucketKey(bucket.key)}
                          onMouseLeave={() => setHoveredBucketKey(null)}
                          onFocus={() => setHoveredBucketKey(bucket.key)}
                          onBlur={() => setHoveredBucketKey(null)}
                          aria-label={`${bucket.label}: ${bucket.lost} lost, ${bucket.found} found`}
                          className={`group flex h-full flex-col justify-end rounded-lg px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                            isHovered
                              ? "bg-neutral-100/80 dark:bg-neutral-800/60"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                          }`}
                        >
                          <div className="flex h-full w-full items-end justify-center gap-1">
                            <span
                              className="w-2.5 rounded-t-sm bg-amber-500 transition-all duration-200 sm:w-3"
                              style={{ height: `${barHeight(bucket.lost)}%` }}
                            />
                            <span
                              className="w-2.5 rounded-t-sm bg-neutral-900 transition-all duration-200 dark:bg-neutral-200 sm:w-3"
                              style={{ height: `${barHeight(bucket.found)}%` }}
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
                        className={`truncate text-[10px] font-medium transition-colors ${
                          hoveredBucketKey === bucket.key
                            ? "text-neutral-950 dark:text-white"
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

          {/* Right: Request Status Funnel */}
          <section
            aria-labelledby="request-funnel-heading"
            className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none sm:p-6 lg:col-span-4"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id="request-funnel-heading"
                  className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white"
                >
                  Request lifecycle
                </h2>
                <span className="text-xs font-semibold text-neutral-500 tabular-nums dark:text-neutral-400">
                  {totalRequests} total
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Combined claim &amp; return outcomes
              </p>

              {totalRequests === 0 ? (
                <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center dark:border-neutral-800">
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    No active requests yet
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Lifecycle distribution will populate as students submit
                    claims and return reports.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                    role="img"
                    aria-label="Request lifecycle distribution"
                  >
                    {requestFunnel.map((row) =>
                      row.count > 0 ? (
                        <div
                          key={row.label}
                          className={`h-full ${FUNNEL_STYLES[row.tone].bar} transition-all duration-300`}
                          style={{
                            width: `${Math.max(4, Math.round((row.count / totalRequests) * 100))}%`,
                          }}
                          title={`${row.label}: ${row.count} (${row.share}%)`}
                        />
                      ) : null,
                    )}
                  </div>

                  <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {requestFunnel.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-3 text-xs first:pt-0 last:pb-0"
                      >
                        <span className="inline-flex items-center gap-2.5 font-medium text-neutral-700 dark:text-neutral-300">
                          <span
                            className={`h-2 w-2 rounded-full ${FUNNEL_STYLES[row.tone].dot}`}
                          />
                          {row.label}
                        </span>
                        <span className="flex items-baseline gap-2 tabular-nums">
                          <strong className="font-bold text-neutral-950 dark:text-white">
                            {row.count}
                          </strong>
                          <span className="w-9 text-right text-[11px] text-neutral-500 dark:text-neutral-400">
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
              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3.5 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <span>Claims: {claims.length}</span>
                <span>Returns: {returnRequests.length}</span>
              </div>
            )}
          </section>
        </div>
      </FadeIn>

      {/* Row 2: Top Categories + Campus Hotspots */}
      <FadeIn delay={0.09}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RankedDistribution
            title="Top categories"
            subtitle={`Most reported item types across ${reports.length} reports`}
            rows={topCategories}
            emptyTitle="No categorized reports yet"
            emptyDescription="Category distribution will appear once lost or found reports are submitted."
            accentTone="crimson"
            icon="category"
          />

          <RankedDistribution
            title="Campus hotspots"
            subtitle="Buildings with the highest lost & found activity"
            rows={topBuildings}
            emptyTitle="No building hotspots yet"
            emptyDescription="Reports tagged with campus buildings will rank here automatically."
            accentTone="ink"
            icon="building"
          />
        </div>
      </FadeIn>
    </div>
  );
}

export default AnalyticsSection;

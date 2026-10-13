import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { claims, itemToAdminReport } from "./adminData";
import type { AdminSection } from "./types";
import type { Item } from "@/data/mockItems";
import type { ReturnItemRequest } from "@/types/claim";

type RangeKey = "7D" | "14D" | "ALL" | "MONTH";

const RANGE_OPTIONS: { id: RangeKey; label: string; days: number | null }[] = [
  { id: "7D", label: "7 days", days: 7 },
  { id: "14D", label: "14 days", days: 14 },
  { id: "ALL", label: "All time", days: null },
  { id: "MONTH", label: "Month", days: null },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LOST_COLOR = "#E5192D";
const FOUND_COLOR = "#0284c7";
const NEUTRAL_BAR = "#171717";

const DAY_MS = 86_400_000;

function parseDate(value: string): number {
  return new Date(`${value}T12:00:00`).getTime();
}

function shortDayLabel(time: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-bold text-neutral-900 dark:text-neutral-100">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <p
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color ?? NEUTRAL_BAR }}
            />
              {entry.name}:{" "}
            <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {entry.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

const axisTick = { fontSize: 10, fill: "#737373" };

// Fallback anchor for the (unreachable in practice) empty-data case: the
// App gates all routes until the examples file has loaded, so reports is
// never empty on first render. Kept at module scope so render stays pure.
const FALLBACK_ANCHOR = Date.now();

export function AnalyticsSection({
  items,
  returnRequests,
  onNavigate,
}: {
  items: Item[];
  returnRequests: ReturnItemRequest[];
  onNavigate: (section: AdminSection) => void;
}) {
  const reports = useMemo(() => items.map(itemToAdminReport), [items]);
  const dataTimestamps = useMemo(
    () => reports.map((r) => parseDate(r.date)),
    [reports],
  );
  const dataAnchor = useMemo(
    () =>
      dataTimestamps.length > 0
        ? Math.max(...dataTimestamps)
        : FALLBACK_ANCHOR,
    [dataTimestamps],
  );
  const dataYears = useMemo(
    () =>
      [
        ...new Set(
          dataTimestamps.map((time) => new Date(time).getFullYear()),
        ),
      ].sort((a, b) => b - a),
    [dataTimestamps],
  );
  const [range, setRange] = useState<RangeKey>("14D");
  const [customMonth, setCustomMonth] = useState(
    () => new Date(dataAnchor).getMonth(),
  );
  const [customYear, setCustomYear] = useState(() =>
    new Date(dataAnchor).getFullYear(),
  );

  const model = useMemo(() => {
    if (range === "MONTH") {
      const daysInMonth = new Date(customYear, customMonth + 1, 0).getDate();
      const inWindow = reports.filter((r) => {
        const d = new Date(parseDate(r.date));
        return (
          d.getFullYear() === customYear && d.getMonth() === customMonth
        );
      });
      const series = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const lost = inWindow.filter(
          (r) =>
            r.type === "Lost" && new Date(parseDate(r.date)).getDate() === day,
        ).length;
        const found = inWindow.filter(
          (r) =>
            r.type === "Found" && new Date(parseDate(r.date)).getDate() === day,
        ).length;
        return { day: `${MONTH_NAMES[customMonth].slice(0, 3)} ${day}`, lost, found };
      });
      return { series, inWindow };
    }

    const anchor = dataAnchor;
    const activeRange = RANGE_OPTIONS.find((r) => r.id === range);
    const windowDays = activeRange?.days ?? null;

    const windowStart =
      windowDays === null ? -Infinity : anchor - (windowDays - 1) * DAY_MS;

    const inWindow = reports.filter(
      (r) => parseDate(r.date) >= windowStart,
    );

    // Daily buckets across the selected window.
    const bucketDays =
      windowDays ??
      Math.min(
        30,
        Math.round((anchor - Math.min(...dataTimestamps)) / DAY_MS) + 1,
      );
    const series = Array.from({ length: bucketDays }, (_, index) => {
      const dayStart = anchor - (bucketDays - 1 - index) * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const lost = reports.filter(
        (r) =>
          r.type === "Lost" &&
          parseDate(r.date) >= dayStart &&
          parseDate(r.date) < dayEnd,
      ).length;
      const found = reports.filter(
        (r) =>
          r.type === "Found" &&
          parseDate(r.date) >= dayStart &&
          parseDate(r.date) < dayEnd,
      ).length;
      return { day: shortDayLabel(dayStart), lost, found };
    });

    return {
      series,
      inWindow,
    };
  }, [reports, dataTimestamps, dataAnchor, range, customMonth, customYear]);

  const rangeLabel =
    range === "MONTH"
      ? `${MONTH_NAMES[customMonth]} ${customYear}`
      : (RANGE_OPTIONS.find((r) => r.id === range)?.label ?? "");

  return (
    <section aria-labelledby="analytics-heading" className="mt-5">
      <div className="mb-3">
        <h2
          id="analytics-heading"
          className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Analytics and insights
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Recovery performance and report trends across campus.
        </p>
      </div>

      <div className="mt-3 grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Panel
          title="Reports over time"
          className="flex min-w-0 flex-col xl:row-span-2"
          action={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div
                role="group"
                aria-label="Select time range"
                className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-0.5"
              >
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRange(option.id)}
                    aria-pressed={range === option.id}
                    className={`h-8 rounded-md px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                      range === option.id
                        ? "bg-neutral-900 dark:bg-neutral-100 dark:bg-neutral-800 text-white dark:text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {range === "MONTH" && (
                <span className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                  <label className="sr-only" htmlFor="analytics-month">
                    Select month
                  </label>
                  <select
                    id="analytics-month"
                    value={customMonth}
                    onChange={(event) =>
                      setCustomMonth(Number(event.target.value))
                    }
                    className="h-8 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    {MONTH_NAMES.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="analytics-year">
                    Select year
                  </label>
                  <select
                    id="analytics-year"
                    value={customYear}
                    onChange={(event) =>
                      setCustomYear(Number(event.target.value))
                    }
                    className="h-8 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    {dataYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </span>
              )}
            </div>
          }
        >
          <div
            className="flex flex-1 flex-col px-2 pb-2 pt-4"
            role="img"
            aria-label={`Daily lost and found reports for ${rangeLabel}. ${model.inWindow.length} reports in the selected range.`}
          >
            <div className="min-h-96 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  key={`${range}-${customMonth}-${customYear}`}
                  data={model.series}
                  margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
                >
                  <CartesianGrid stroke="#e5e5e5" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e5e5" }}
                    interval="preserveStartEnd"
                    minTickGap={32}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="lost"
                    name="Lost"
                    stroke={LOST_COLOR}
                    fill={LOST_COLOR}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="found"
                    name="Found"
                    stroke={FOUND_COLOR}
                    fill={FOUND_COLOR}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 px-3 pb-3">
              {[
                { label: "Lost", color: LOST_COLOR },
                { label: "Found", color: FOUND_COLOR },
              ].map((entry) => (
                <span
                  key={entry.label}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.label}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Recent submitted claims"
          className="flex h-full flex-col"
          action={
            <button
              type="button"
              onClick={() => onNavigate("claims")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View claims
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ul className="flex flex-1 flex-col justify-center divide-y divide-neutral-100 dark:divide-neutral-800">
            {claims.slice(0, 4).map((claim) => (
              <li
                key={claim.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {claim.item}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                    {claim.claimant} · {claim.submitted}
                  </span>
                </span>
                <StatusBadge status={claim.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Recent return items"
          className="flex h-full flex-col"
          action={
            <button
              type="button"
              onClick={() => onNavigate("returns")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View returns
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ul className="flex flex-1 flex-col justify-center divide-y divide-neutral-100 dark:divide-neutral-800">
            {returnRequests
              .filter((request) => request.status === "Pending")
              .slice(0, 4)
              .map((request) => (
              <li
                key={request.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {request.lostItemTitle}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                    {request.claimant} · {request.submitted}
                  </span>
                </span>
                <StatusBadge status={request.status} />
              </li>
            ))}
            {returnRequests.every(
              (request) => request.status !== "Pending",
            ) && (
              <li className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 sm:px-5">
                No pending return items.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

export default AnalyticsSection;

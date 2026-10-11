import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "./Panel";
import { adminReports } from "./adminData";
import { ITEM_CATEGORIES } from "@/data/itemCategories";

type RangeKey = "7D" | "14D" | "ALL";

const RANGE_OPTIONS: { id: RangeKey; label: string; days: number | null }[] = [
  { id: "7D", label: "7 days", days: 7 },
  { id: "14D", label: "14 days", days: 14 },
  { id: "ALL", label: "All time", days: null },
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
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-bold text-neutral-900">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <p
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-1.5 text-[11px] text-neutral-600"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color ?? NEUTRAL_BAR }}
            />
              {entry.name}:{" "}
            <span className="font-bold tabular-nums text-neutral-900">
              {entry.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

const axisTick = { fontSize: 10, fill: "#737373" };

function DonutSegmentLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  fill = "#ffffff",
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number | string;
  fill?: string;
}) {
  if (value === undefined || value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = ((innerRadius ?? 0) + (outerRadius ?? 0)) / 2;
  const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontSize={13}
      fontWeight={800}
    >
      {value}
    </text>
  );
}

export function AnalyticsSection() {
  const [range, setRange] = useState<RangeKey>("14D");

  const model = useMemo(() => {
    const anchor = Math.max(...adminReports.map((r) => parseDate(r.date)));
    const activeRange = RANGE_OPTIONS.find((r) => r.id === range);
    const windowDays = activeRange?.days ?? null;

    const windowStart =
      windowDays === null ? -Infinity : anchor - (windowDays - 1) * DAY_MS;

    const inWindow = adminReports.filter(
      (r) => parseDate(r.date) >= windowStart,
    );

    // Daily buckets across the selected window.
    const bucketDays =
      windowDays ??
      Math.min(
        30,
        Math.round((anchor - Math.min(...adminReports.map((r) => parseDate(r.date)))) / DAY_MS) + 1,
      );
    const series = Array.from({ length: bucketDays }, (_, index) => {
      const dayStart = anchor - (bucketDays - 1 - index) * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const lost = adminReports.filter(
        (r) =>
          r.type === "Lost" &&
          parseDate(r.date) >= dayStart &&
          parseDate(r.date) < dayEnd,
      ).length;
      const found = adminReports.filter(
        (r) =>
          r.type === "Found" &&
          parseDate(r.date) >= dayStart &&
          parseDate(r.date) < dayEnd,
      ).length;
      return { day: shortDayLabel(dayStart), lost, found };
    });

    const reunited = adminReports.filter(
      (r) => r.status === "Returned" || r.status === "Claimed",
    ).length;
    const recoveryRate =
      adminReports.length === 0
        ? 0
        : Math.round((reunited / adminReports.length) * 100);

    const openLostCount = adminReports.filter(
      (r) => r.status === "Lost",
    ).length;
    const openFoundCount = adminReports.filter(
      (r) => r.status === "Found",
    ).length;

    const donut = [
      {
        name: "Returned",
        value: adminReports.filter((r) => r.status === "Returned").length,
        color: "#059669",
      },
      {
        name: "Claimed",
        value: adminReports.filter((r) => r.status === "Claimed").length,
        color: FOUND_COLOR,
      },
    ];

    const openDonut = [
      {
        name: "Item lost",
        value: openLostCount,
        color: "#f87171",
      },
      {
        name: "Item found",
        value: openFoundCount,
        color: "#a3a3a3",
      },
    ];

    // Same category list as the school_user dashboard (eyewear excluded),
    // so both surfaces speak the same language — including zeros.
    const schoolCategories = ITEM_CATEGORIES.filter(
      (category) => category.id !== "eyewear",
    );
    const countsByLabel = new Map<string, { lost: number; found: number }>();
    for (const r of adminReports) {
      const entry = countsByLabel.get(r.category) ?? { lost: 0, found: 0 };
      if (r.type === "Lost") entry.lost += 1;
      else entry.found += 1;
      countsByLabel.set(r.category, entry);
    }
    const categories = schoolCategories
      .map((category) => ({
        category: category.label,
        lost: countsByLabel.get(category.label)?.lost ?? 0,
        found: countsByLabel.get(category.label)?.found ?? 0,
      }))
      .sort(
        (a, b) =>
          b.lost + b.found - (a.lost + a.found) ||
          a.category.localeCompare(b.category),
      );

    return {
      series,
      inWindow,
      recoveryRate,
      donut,
      openDonut,
      categories,
    };
  }, [range]);

  return (
    <section aria-labelledby="analytics-heading" className="mt-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="analytics-heading"
            className="text-sm font-extrabold tracking-tight text-neutral-900"
          >
            Analytics and insights
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Recovery performance and report trends across campus.
          </p>
        </div>
        <div
          role="group"
          aria-label="Select time range"
          className="flex rounded-lg border border-neutral-200 bg-white p-0.5"
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              aria-pressed={range === option.id}
              className={`h-8 rounded-md px-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                range === option.id
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Panel title="Reports over time">
          <div
            className="px-2 pb-2 pt-4"
            role="img"
            aria-label={`Daily lost and found reports. ${model.inWindow.length} reports in the selected range.`}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
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
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600"
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
      </div>

      <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
        <Panel title="Reports by category">
          <div
            className="px-2 pb-4 pt-4"
            role="img"
            aria-label="Lost and found reports grouped by item category."
          >
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={model.categories}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid stroke="#e5e5e5" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ ...axisTick, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={132}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f5f5" }} />
                  <Bar dataKey="lost" name="Lost" stackId="total" fill={LOST_COLOR} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="found" name="Found" stackId="total" fill={FOUND_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel title="Recovery mix" borderless>
          <div
            className="px-4 pb-4 pt-2"
            role="img"
            aria-label={`Recovery mix. ${model.recoveryRate} percent of reports reunited. Closed versus currently open reports shown side by side.`}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="relative mx-auto h-36 max-w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip />} />
                      <Pie
                        data={model.donut}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="68%"
                        outerRadius="100%"
                        paddingAngle={2}
                        strokeWidth={0}
                        labelLine={false}
                        label={DonutSegmentLabel}
                      >
                        {model.donut.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900">
                      {model.donut.reduce((sum, entry) => sum + entry.value, 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="relative mx-auto h-36 max-w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip />} />
                      <Pie
                        data={model.openDonut}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="68%"
                        outerRadius="100%"
                        paddingAngle={2}
                        strokeWidth={0}
                        labelLine={false}
                        label={(props) => (
                          <DonutSegmentLabel {...props} fill="#171717" />
                        )}
                      >
                        {model.openDonut.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900">
                      {model.openDonut.reduce(
                        (sum, entry) => sum + entry.value,
                        0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ul className="mt-2 space-y-1.5">
              {[...model.donut, ...model.openDonut].map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-2 text-[11px] text-neutral-600"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium">{entry.name}</span>
                  <span className="ml-auto font-bold tabular-nums text-neutral-900">
                    {entry.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </section>
  );
}

export default AnalyticsSection;

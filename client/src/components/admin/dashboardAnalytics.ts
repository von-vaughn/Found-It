import type { AdminReport, AdminUser } from "./types";
import type { ClaimRequest } from "@/types/claim";

export type TrendRangeDays = 7 | 30 | 90;

export interface TrendBucket {
  key: string;
  label: string;
  lost: number;
  found: number;
  resolved: number;
}

export interface RankedCount {
  label: string;
  count: number;
  share: number;
}

export interface StatusFunnelRow {
  label: string;
  count: number;
  share: number;
  tone: "amber" | "blue" | "emerald" | "red";
}

export interface DashboardSummary {
  lostCount: number;
  foundCount: number;
  resolvedCount: number;
  recoveryRate: number;
  unclaimedFoundCount: number;
  unclaimedInOsaCount: number;
  unclaimedWithFinderCount: number;
  pendingClaimsCount: number;
  pendingReturnsCount: number;
  approvedClaimsCount: number;
  approvedReturnsCount: number;
  awaitingPickupCount: number;
  flaggedPostsCount: number;
}

export interface AccountSummary {
  total: number;
  schoolUsers: number;
  staff: number;
  admins: number;
  active: number;
  inactive: number;
}

function parseReportDate(report: AdminReport): Date | null {
  const raw = report.eventDateTime || report.date;
  if (!raw) return null;
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const parsed = new Date(isoDateOnly ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeDashboardSummary(
  reports: AdminReport[],
  claims: ClaimRequest[],
  returnRequests: ClaimRequest[],
): DashboardSummary {
  let lostCount = 0;
  let foundCount = 0;
  let resolvedCount = 0;
  let unclaimedFoundCount = 0;
  let unclaimedInOsaCount = 0;
  let unclaimedWithFinderCount = 0;
  let flaggedPostsCount = 0;

  for (const report of reports) {
    if (report.type === "Lost") lostCount++;
    else foundCount++;

    const isResolved =
      report.status === "Claimed" || report.status === "Returned";
    if (isResolved) {
      resolvedCount++;
    } else if (report.type === "Found") {
      unclaimedFoundCount++;
      if (report.receivedByOsa) unclaimedInOsaCount++;
      else unclaimedWithFinderCount++;
    }

    if ((report.flagCount ?? 0) > 0) {
      flaggedPostsCount++;
    }
  }

  const pendingClaimsCount = claims.filter((c) => c.status === "Pending").length;
  const pendingReturnsCount = returnRequests.filter(
    (r) => r.status === "Pending",
  ).length;
  const approvedClaimsCount = claims.filter(
    (c) => c.status === "Approved",
  ).length;
  const approvedReturnsCount = returnRequests.filter(
    (r) => r.status === "Approved",
  ).length;

  const recoveryRate =
    reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;

  return {
    lostCount,
    foundCount,
    resolvedCount,
    recoveryRate,
    unclaimedFoundCount,
    unclaimedInOsaCount,
    unclaimedWithFinderCount,
    pendingClaimsCount,
    pendingReturnsCount,
    approvedClaimsCount,
    approvedReturnsCount,
    awaitingPickupCount: approvedClaimsCount + approvedReturnsCount,
    flaggedPostsCount,
  };
}

export function computeReportsTrend(
  reports: AdminReport[],
  rangeDays: TrendRangeDays,
  now: Date = new Date(),
): TrendBucket[] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - (rangeDays - 1));

  // Group into daily buckets for 7D, 5-day buckets for 30D (6 buckets),
  // and 15-day buckets for 90D (6 buckets) so labels stay legible.
  const stepDays = rangeDays === 7 ? 1 : rangeDays === 30 ? 5 : 15;
  const bucketCount = Math.ceil(rangeDays / stepDays);
  const shortMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const buckets: Array<TrendBucket & { startMs: number; endMs: number }> = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + i * stepDays);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + stepDays - 1);
    if (bucketEnd > end) {
      bucketEnd.setTime(end.getTime());
    }
    const endOfDay = new Date(bucketEnd);
    endOfDay.setHours(23, 59, 59, 999);

    buckets.push({
      key: localDayKey(bucketStart),
      label:
        stepDays === 1
          ? shortMonth.format(bucketStart)
          : `${shortMonth.format(bucketStart)}`,
      lost: 0,
      found: 0,
      resolved: 0,
      startMs: bucketStart.getTime(),
      endMs: endOfDay.getTime(),
    });
  }

  for (const report of reports) {
    const parsed = parseReportDate(report);
    if (!parsed) continue;
    const ms = parsed.getTime();
    if (ms < buckets[0].startMs || ms > buckets[buckets.length - 1].endMs) {
      continue;
    }
    const bucket = buckets.find((entry) => ms >= entry.startMs && ms <= entry.endMs);
    if (!bucket) continue;

    if (report.status === "Claimed" || report.status === "Returned") {
      bucket.resolved++;
    } else if (report.type === "Lost") {
      bucket.lost++;
    } else {
      bucket.found++;
    }
  }

  return buckets.map(({ key, label, lost, found, resolved }) => ({
    key,
    label,
    lost,
    found,
    resolved,
  }));
}

/** Returns sorted descending years found across reports (always includes current year). */
export function getAvailableReportYears(
  reports: AdminReport[],
  now: Date = new Date(),
): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const report of reports) {
    const parsed = parseReportDate(report);
    if (parsed) years.add(parsed.getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Buckets reports for a specific year (all 12 months when monthIndex === "all",
 * or ~5-day intervals across a specific 0-based monthIndex).
 */
export function computeMonthlyReportsTrend(
  reports: AdminReport[],
  year: number,
  monthIndex: number | "all",
): TrendBucket[] {
  const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });

  if (monthIndex === "all") {
    const buckets: TrendBucket[] = Array.from({ length: 12 }, (_, m) => ({
      key: `${year}-${String(m + 1).padStart(2, "0")}`,
      label: shortMonth.format(new Date(year, m, 1)),
      lost: 0,
      found: 0,
      resolved: 0,
    }));

    for (const report of reports) {
      const parsed = parseReportDate(report);
      if (!parsed || parsed.getFullYear() !== year) continue;
      const bucket = buckets[parsed.getMonth()];
      if (!bucket) continue;
      if (report.type === "Lost") {
        bucket.lost++;
      } else {
        bucket.found++;
      }
    }
    return buckets;
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const step = 5;
  const buckets: Array<TrendBucket & { startDay: number; endDay: number }> = [];

  for (let startDay = 1; startDay <= daysInMonth; startDay += step) {
    const endDay = Math.min(startDay + step - 1, daysInMonth);
    buckets.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
      label: startDay === endDay ? `${startDay}` : `${startDay}–${endDay}`,
      lost: 0,
      found: 0,
      resolved: 0,
      startDay,
      endDay,
    });
  }

  for (const report of reports) {
    const parsed = parseReportDate(report);
    if (
      !parsed ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== monthIndex
    ) {
      continue;
    }
    const day = parsed.getDate();
    const bucket = buckets.find(
      (entry) => day >= entry.startDay && day <= entry.endDay,
    );
    if (!bucket) continue;
    if (report.type === "Lost") {
      bucket.lost++;
    } else {
      bucket.found++;
    }
  }

  return buckets.map(({ key, label, lost, found, resolved }) => ({
    key,
    label,
    lost,
    found,
    resolved,
  }));
}

export function computeTopCategories(
  reports: AdminReport[],
  limit = 6,
): RankedCount[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    // Collapse "Other (Helmet)" into "Other" for clean category grouping while preserving custom labels elsewhere.
    const raw = report.category.trim();
    const label = raw.startsWith("Other (")
      ? "Other"
      : raw || "Uncategorized";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = reports.length;
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      share: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export function computeTopBuildings(
  reports: AdminReport[],
  limit = 6,
): RankedCount[] {
  const counts = new Map<string, number>();
  let totalWithBuilding = 0;
  for (const report of reports) {
    const label = (report.buildingName || report.building || "").trim();
    if (!label) continue;
    totalWithBuilding++;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      share:
        totalWithBuilding > 0
          ? Math.round((count / totalWithBuilding) * 100)
          : 0,
    }));
}

export function computeRequestStatusFunnel(
  claims: ClaimRequest[],
  returnRequests: ClaimRequest[],
): StatusFunnelRow[] {
  const all = [...claims, ...returnRequests];
  const pending = all.filter((r) => r.status === "Pending").length;
  const approved = all.filter((r) => r.status === "Approved").length;
  const completed = all.filter(
    (r) => r.status === "Claimed" || r.status === "Returned",
  ).length;
  const rejected = all.filter((r) => r.status === "Rejected").length;
  const total = all.length;
  const pct = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return [
    { label: "Pending", count: pending, share: pct(pending), tone: "amber" },
    { label: "Approved", count: approved, share: pct(approved), tone: "blue" },
    {
      label: "Claimed / Returned",
      count: completed,
      share: pct(completed),
      tone: "emerald",
    },
    { label: "Rejected", count: rejected, share: pct(rejected), tone: "red" },
  ];
}

export function computeAccountSummary(users: AdminUser[]): AccountSummary {
  let schoolUsers = 0;
  let staff = 0;
  let admins = 0;
  let active = 0;
  let inactive = 0;

  for (const user of users) {
    if (user.role === "school_user") schoolUsers++;
    else if (user.role === "admin") staff++;
    else admins++;

    if (user.isActive) active++;
    else inactive++;
  }

  return {
    total: users.length,
    schoolUsers,
    staff,
    admins,
    active,
    inactive,
  };
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildDashboardSummaryCsv(params: {
  summary: DashboardSummary;
  categories: RankedCount[];
  buildings: RankedCount[];
  funnel: StatusFunnelRow[];
  accounts?: AccountSummary;
}): string {
  const rows: Array<[string, string, string | number]> = [
    ["Section", "Metric", "Value"],
    ["Summary", "Lost Reports", params.summary.lostCount],
    ["Summary", "Found Reports", params.summary.foundCount],
    ["Summary", "Resolved Reports", params.summary.resolvedCount],
    ["Summary", "Recovery Rate (%)", params.summary.recoveryRate],
    ["Summary", "Unclaimed Found Items", params.summary.unclaimedFoundCount],
    ["Summary", "Unclaimed At OSA", params.summary.unclaimedInOsaCount],
    [
      "Summary",
      "Unclaimed With Finder",
      params.summary.unclaimedWithFinderCount,
    ],
    ["Summary", "Pending Claims", params.summary.pendingClaimsCount],
    ["Summary", "Pending Return Requests", params.summary.pendingReturnsCount],
    ["Summary", "Awaiting Pickup", params.summary.awaitingPickupCount],
    ["Summary", "Flagged Posts", params.summary.flaggedPostsCount],
  ];

  for (const row of params.funnel) {
    rows.push(["Request Funnel", row.label, `${row.count} (${row.share}%)`]);
  }
  for (const row of params.categories) {
    rows.push(["Top Categories", row.label, `${row.count} (${row.share}%)`]);
  }
  for (const row of params.buildings) {
    rows.push(["Campus Hotspots", row.label, `${row.count} (${row.share}%)`]);
  }
  if (params.accounts) {
    rows.push(["Accounts", "Total Accounts", params.accounts.total]);
    rows.push(["Accounts", "School Users", params.accounts.schoolUsers]);
    rows.push(["Accounts", "Staff", params.accounts.staff]);
    rows.push(["Accounts", "Admins", params.accounts.admins]);
    rows.push(["Accounts", "Active Accounts", params.accounts.active]);
    rows.push(["Accounts", "Inactive Accounts", params.accounts.inactive]);
  }

  return rows
    .map((line) => line.map(escapeCsvCell).join(","))
    .join("\n");
}

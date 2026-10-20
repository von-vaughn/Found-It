import type { Item } from "@/data/mockItems";

export interface ReportMoment {
  /** UTC start of the report's calendar day. */
  dayStart: number;
  /** Exact timestamp, or null when the report has no clock time. */
  timedMs: number | null;
}

export function reportMoment(entry: Item): ReportMoment | null {
  const dayStart = Date.parse(`${entry.date}T00:00:00Z`);
  if (Number.isNaN(dayStart)) return null;
  if (!entry.dateTime) return { dayStart, timedMs: null };
  const parsed = new Date(entry.dateTime);
  return {
    dayStart,
    timedMs: Number.isNaN(parsed.getTime()) ? null : parsed.getTime(),
  };
}

/** Minutes between the lost and found report; negative means found first. */
export function minutesApart(lost: ReportMoment, found: ReportMoment): number {
  if (lost.timedMs !== null && found.timedMs !== null) {
    return (found.timedMs - lost.timedMs) / 60_000;
  }
  return ((found.dayStart - lost.dayStart) / 86_400_000) * 1440;
}

/** Closer pairs score higher; anything over a week adds nothing. */
export function timePoints(gapMinutes: number): number {
  if (gapMinutes < 0) return 0;
  if (gapMinutes <= 15) return 15;
  if (gapMinutes <= 60) return 14;
  if (gapMinutes <= 180) return 12;
  if (gapMinutes <= 360) return 10;
  if (gapMinutes <= 720) return 8;
  if (gapMinutes <= 1440) return 6;
  if (gapMinutes <= 4320) return 4;
  if (gapMinutes <= 10080) return 2;
  return 0;
}

export interface ReportMoment {
  /** UTC start of the report's calendar day. */
  dayStart: number;
  /** Exact timestamp, or null when the report has no clock time. */
  timedMs: number | null;
}

export function reportMoment(itemDate: string, itemTime?: string | null): ReportMoment | null {
  const dayStart = Date.parse(`${itemDate}T00:00:00Z`);
  if (Number.isNaN(dayStart)) return null;
  const trimmedTime = itemTime?.trim();
  if (!trimmedTime) return { dayStart, timedMs: null };
  const hhmm = trimmedTime.slice(0, 5);
  const parsed = Date.parse(`${itemDate}T${hhmm}:00Z`);
  return {
    dayStart,
    timedMs: Number.isNaN(parsed) ? null : parsed,
  };
}

/** Minutes between the lost and found report; negative means found first. */
export function minutesApart(lost: ReportMoment, found: ReportMoment): number {
  if (lost.timedMs !== null && found.timedMs !== null) {
    return (found.timedMs - lost.timedMs) / 60_000;
  }
  return ((found.dayStart - lost.dayStart) / 86_400_000) * 1440;
}

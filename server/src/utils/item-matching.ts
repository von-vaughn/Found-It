export interface ReportMoment {
  /** UTC start of the report's calendar day. */
  dayStart: number;
  /** Exact timestamp, or null when the report has no clock time. */
  timedMs: number | null;
}

export interface MatchableReport {
  name: string;
  description: string;
  itemDate: string;
  itemTime?: string | null;
  color?: string | null;
  building?: string | null;
  location?: string | null;
}

const STOPWORDS = new Set([
  'with',
  'from',
  'that',
  'this',
  'have',
  'your',
  'near',
  'around',
]);

export function keywordSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((word) => word.length >= 4 && !STOPWORDS.has(word)),
  );
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

/**
 * Scores a candidate found report that already shares the lost item's category.
 * Returns null if the candidate was found before the item was lost or scores below 45.
 */
export function scoreFoundCandidate(
  lost: MatchableReport,
  found: MatchableReport,
): number | null {
  const lostMoment = reportMoment(lost.itemDate, lost.itemTime);
  const foundMoment = reportMoment(found.itemDate, found.itemTime);
  if (lostMoment && foundMoment && minutesApart(lostMoment, foundMoment) < 0) {
    return null;
  }

  let score = 40;
  if (
    lost.color?.trim() &&
    found.color?.trim() &&
    found.color.trim().toLowerCase() === lost.color.trim().toLowerCase()
  ) {
    score += 25;
  }

  const place = `${found.location ?? ''} ${found.building ?? ''}`.trim().toLowerCase();
  const lostPlace = `${lost.location ?? ''} ${lost.building ?? ''}`.trim().toLowerCase();
  const sameBuilding = Boolean(
    found.building?.trim() &&
      lost.building?.trim() &&
      found.building.trim().toLowerCase() === lost.building.trim().toLowerCase(),
  );
  if (
    sameBuilding ||
    (place && lostPlace && (place.includes(lostPlace) || lostPlace.includes(place)))
  ) {
    score += 20;
  }

  if (lostMoment && foundMoment) {
    score += timePoints(minutesApart(lostMoment, foundMoment));
  }

  const lostKeywords = keywordSet(`${lost.name} ${lost.description}`);
  const foundKeywords = keywordSet(`${found.name} ${found.description}`);
  let overlap = 0;
  for (const word of lostKeywords) {
    if (foundKeywords.has(word)) overlap += 1;
  }
  score += Math.min(overlap * 5, 20);

  return score >= 45 ? score : null;
}

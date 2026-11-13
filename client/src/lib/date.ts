/** Formats a Date as local YYYY-MM-DD (avoids UTC off-by-one near midnight). */
export function localTodayDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Parses an item's timestamp, falling back to calendar date when time is absent. */
export function parseItemEventDate(
  dateTime?: string,
  date?: string,
): { eventDate: Date | null; hasTime: boolean } {
  if (dateTime) {
    const parsed = new Date(dateTime);
    if (!Number.isNaN(parsed.getTime())) {
      return { eventDate: parsed, hasTime: true };
    }
  }
  if (date) {
    const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return { eventDate: parsed, hasTime: false };
    }
  }
  return { eventDate: null, hasTime: false };
}

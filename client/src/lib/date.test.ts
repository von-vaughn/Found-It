import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { localTodayDate, parseItemEventDate } from "./date.ts";

describe("localTodayDate", () => {
  it("formats local calendar date without shifting early-morning UTC+8 hours to previous day", () => {
    // 2026-03-15 00:30 local time in UTC+8 is 2026-03-14 16:30Z.
    const localAfterMidnight = new Date(2026, 2, 15, 0, 30, 0);
    assert.equal(localTodayDate(localAfterMidnight), "2026-03-15");
  });
});

describe("parseItemEventDate", () => {
  it("uses full timestamp when dateTime is valid", () => {
    const { eventDate, hasTime } = parseItemEventDate(
      "2026-03-15T14:30:00",
      "2026-03-15",
    );
    assert.ok(eventDate instanceof Date);
    assert.equal(hasTime, true);
  });

  it("falls back to calendar date when dateTime is absent", () => {
    const { eventDate, hasTime } = parseItemEventDate(undefined, "2026-03-15");
    assert.ok(eventDate instanceof Date);
    assert.equal(eventDate.getFullYear(), 2026);
    assert.equal(eventDate.getMonth(), 2);
    assert.equal(eventDate.getDate(), 15);
    assert.equal(hasTime, false);
  });

  it("returns null when both dateTime and date are missing or invalid", () => {
    const { eventDate, hasTime } = parseItemEventDate("invalid", "");
    assert.equal(eventDate, null);
    assert.equal(hasTime, false);
  });
});

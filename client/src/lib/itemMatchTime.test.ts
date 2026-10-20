import test from "node:test";
import assert from "node:assert/strict";
import { minutesApart, reportMoment, timePoints } from "./itemMatchTime.ts";
import type { Item } from "@/data/mockItems";

const timed = (iso: string) =>
  ({ date: iso.slice(0, 10), dateTime: iso }) as Item;
const dated = (date: string) => ({ date }) as Item;

test("found before lost produces a negative gap", () => {
  const lost = reportMoment(timed("2026-10-10T14:30:00Z"))!;
  const found = reportMoment(timed("2026-10-10T14:20:00Z"))!;
  assert.equal(minutesApart(lost, found), -10);
});

test("gap is measured in minutes and hours", () => {
  const lost = reportMoment(timed("2026-10-10T14:30:00Z"))!;
  assert.equal(minutesApart(lost, reportMoment(timed("2026-10-10T14:45:00Z"))!), 15);
  assert.equal(minutesApart(lost, reportMoment(timed("2026-10-10T16:30:00Z"))!), 120);
  assert.equal(minutesApart(lost, reportMoment(timed("2026-10-11T14:30:00Z"))!), 1440);
});

test("time points decay with the gap", () => {
  assert.equal(timePoints(0), 15);
  assert.equal(timePoints(15), 15);
  assert.equal(timePoints(16), 14);
  assert.equal(timePoints(60), 14);
  assert.equal(timePoints(61), 12);
  assert.equal(timePoints(180), 12);
  assert.equal(timePoints(181), 10);
  assert.equal(timePoints(360), 10);
  assert.equal(timePoints(361), 8);
  assert.equal(timePoints(720), 8);
  assert.equal(timePoints(721), 6);
  assert.equal(timePoints(1440), 6);
  assert.equal(timePoints(1441), 4);
  assert.equal(timePoints(4320), 4);
  assert.equal(timePoints(4321), 2);
  assert.equal(timePoints(10080), 2);
  assert.equal(timePoints(10081), 0);
});

test("a report without a clock time falls back to whole days", () => {
  const lost = reportMoment(timed("2026-10-10T14:30:00Z"))!;
  const found = reportMoment(dated("2026-10-11"))!;
  assert.equal(minutesApart(lost, found), 1440);
});

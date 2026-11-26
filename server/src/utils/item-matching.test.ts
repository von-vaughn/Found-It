import test from 'node:test';
import assert from 'node:assert/strict';
import { minutesApart, reportMoment } from './item-matching';

test('found before lost produces a negative gap', () => {
  const lost = reportMoment('2026-10-10', '14:30')!;
  const found = reportMoment('2026-10-10', '14:20')!;
  assert.equal(minutesApart(lost, found), -10);
});

test('gap is measured in minutes and hours', () => {
  const lost = reportMoment('2026-10-10', '14:30')!;
  assert.equal(minutesApart(lost, reportMoment('2026-10-10', '14:45')!), 15);
  assert.equal(minutesApart(lost, reportMoment('2026-10-10', '16:30')!), 120);
  assert.equal(minutesApart(lost, reportMoment('2026-10-11', '14:30')!), 1440);
});

test('a report without a clock time falls back to whole days', () => {
  const lost = reportMoment('2026-10-10', '14:30')!;
  const found = reportMoment('2026-10-11', null)!;
  assert.equal(minutesApart(lost, found), 1440);
});

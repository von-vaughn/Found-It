import test from 'node:test';
import assert from 'node:assert/strict';
import {
  minutesApart,
  reportMoment,
  scoreFoundCandidate,
  timePoints,
} from './item-matching';

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

test('time points decay with the gap', () => {
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

test('a report without a clock time falls back to whole days', () => {
  const lost = reportMoment('2026-10-10', '14:30')!;
  const found = reportMoment('2026-10-11', null)!;
  assert.equal(minutesApart(lost, found), 1440);
});

test('scoreFoundCandidate rejects found reports timestamped before lost report', () => {
  const lost = {
    name: 'Black Leather Bi-fold Wallet',
    description: 'Slim black leather wallet misplaced while reviewing at the library.',
    itemDate: '2026-10-10',
    itemTime: '14:20',
    color: 'Black',
    building: 'Library',
  };
  const foundEarlier = {
    ...lost,
    itemTime: '13:00',
  };
  assert.equal(scoreFoundCandidate(lost, foundEarlier), null);
});

test('scoreFoundCandidate ranks high-signal matches above weak matches', () => {
  const lost = {
    name: 'Black Leather Bi-fold Wallet',
    description: 'Slim black leather wallet misplaced while reviewing at the library.',
    itemDate: '2026-10-10',
    itemTime: '14:20',
    color: 'Black',
    building: 'Library',
    location: 'Second floor study tables',
  };
  const strongMatch = {
    name: 'Black Leather Wallet Near Library',
    description: 'Found a black leather wallet on the second floor study tables.',
    itemDate: '2026-10-10',
    itemTime: '15:10',
    color: 'Black',
    building: 'Library',
    location: 'Second floor study tables',
  };
  const weakerMatch = {
    name: 'Dark Leather Card & Cash Wallet',
    description: 'Black leather wallet turned in near the cafeteria counter.',
    itemDate: '2026-10-11',
    itemTime: '11:00',
    color: 'Black',
    building: 'Cafeteria B - Beside CCS',
    location: 'Counter area',
  };
  const strongScore = scoreFoundCandidate(lost, strongMatch);
  const weakerScore = scoreFoundCandidate(lost, weakerMatch);
  assert.ok(strongScore !== null && weakerScore !== null);
  assert.ok(strongScore > weakerScore);
});

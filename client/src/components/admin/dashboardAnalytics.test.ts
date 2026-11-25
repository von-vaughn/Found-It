import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDashboardSummaryCsv,
  computeAccountSummary,
  computeDashboardSummary,
  computeMonthlyReportsTrend,
  computeReportsTrend,
  computeRequestStatusFunnel,
  computeTopBuildings,
  computeTopCategories,
  getAvailableReportYears,
} from "./dashboardAnalytics.ts";
import type { AdminReport, AdminUser } from "./types.ts";
import type { ClaimRequest } from "@/types/claim";

const sampleReports: AdminReport[] = [
  {
    id: "r1",
    title: "iPhone 14",
    type: "Found",
    receivedByOsa: true,
    image: "",
    category: "Electronics",
    description: "",
    building: "CCS Building",
    buildingName: "CCS Building",
    specificLocation: "Room 201",
    color: "Black",
    reportedBy: "Finder A",
    reporterEmail: "a@wmsu.edu.ph",
    status: "Found",
    date: "2026-11-24",
    flagCount: 1,
  },
  {
    id: "r2",
    title: "Helmet",
    type: "Found",
    receivedByOsa: false,
    image: "",
    category: "Other (Helmet)",
    description: "",
    building: "CCS Building",
    buildingName: "CCS Building",
    specificLocation: "Gate",
    color: "Red",
    reportedBy: "Finder B",
    reporterEmail: "b@wmsu.edu.ph",
    status: "Found",
    date: "2026-11-23",
  },
  {
    id: "r3",
    title: "Student ID",
    type: "Lost",
    receivedByOsa: false,
    image: "",
    category: "ID",
    description: "",
    building: "Library",
    buildingName: "Library",
    specificLocation: "2F",
    color: "White",
    reportedBy: "Owner C",
    reporterEmail: "c@wmsu.edu.ph",
    status: "Returned",
    date: "2026-11-22",
  },
  {
    id: "r4",
    title: "AirPods",
    type: "Found",
    receivedByOsa: true,
    image: "",
    category: "Electronics",
    description: "",
    building: "Library",
    buildingName: "Library",
    specificLocation: "Desk",
    color: "White",
    reportedBy: "Finder D",
    reporterEmail: "d@wmsu.edu.ph",
    status: "Claimed",
    date: "2026-11-24",
  },
];

const sampleClaims: ClaimRequest[] = [
  {
    id: "c1",
    itemId: "r1",
    item: "iPhone 14",
    claimant: "Claimant 1",
    dateLost: "2026-11-24",
    location: "CCS",
    details: "",
    status: "Approved",
    submitted: "Nov 24",
  },
  {
    id: "c2",
    itemId: "r2",
    item: "Helmet",
    claimant: "Claimant 2",
    dateLost: "2026-11-23",
    location: "Gate",
    details: "",
    status: "Pending",
    submitted: "Nov 23",
  },
];

const sampleReturns: ClaimRequest[] = [
  {
    id: "ret1",
    itemId: "r3",
    item: "Student ID",
    claimant: "Finder 1",
    dateLost: "2026-11-22",
    location: "Library",
    details: "",
    status: "Returned",
    submitted: "Nov 22",
  },
  {
    id: "ret2",
    itemId: "r3",
    item: "Student ID",
    claimant: "Finder 2",
    dateLost: "2026-11-22",
    location: "Library",
    details: "",
    status: "Rejected",
    submitted: "Nov 22",
  },
];

test("computeDashboardSummary calculates recovery rate, custody split, awaiting pickup, and flags", () => {
  const summary = computeDashboardSummary(
    sampleReports,
    sampleClaims,
    sampleReturns,
  );
  assert.equal(summary.lostCount, 1);
  assert.equal(summary.foundCount, 3);
  assert.equal(summary.resolvedCount, 2);
  assert.equal(summary.recoveryRate, 50);
  assert.equal(summary.unclaimedFoundCount, 2);
  assert.equal(summary.unclaimedInOsaCount, 1);
  assert.equal(summary.unclaimedWithFinderCount, 1);
  assert.equal(summary.awaitingPickupCount, 1);
  assert.equal(summary.flaggedPostsCount, 1);
});

test("computeTopCategories groups Other (Custom) under Other and computes shares", () => {
  const categories = computeTopCategories(sampleReports);
  assert.deepEqual(categories, [
    { label: "Electronics", count: 2, share: 50 },
    { label: "ID", count: 1, share: 25 },
    { label: "Other", count: 1, share: 25 },
  ]);
});

test("computeTopBuildings ranks campus hotspots", () => {
  const buildings = computeTopBuildings(sampleReports);
  assert.deepEqual(buildings, [
    { label: "CCS Building", count: 2, share: 50 },
    { label: "Library", count: 2, share: 50 },
  ]);
});

test("computeRequestStatusFunnel aggregates claims and returns across lifecycle statuses", () => {
  const funnel = computeRequestStatusFunnel(sampleClaims, sampleReturns);
  assert.deepEqual(
    funnel.map((row) => [row.label, row.count, row.share]),
    [
      ["Pending", 1, 25],
      ["Approved", 1, 25],
      ["Claimed / Returned", 1, 25],
      ["Rejected", 1, 25],
    ],
  );
});

test("computeReportsTrend buckets reports into 7D windows", () => {
  const trend = computeReportsTrend(
    sampleReports,
    7,
    new Date("2026-11-24T12:00:00"),
  );
  assert.equal(trend.length, 7);
  const nov24 = trend.find((b) => b.key === "2026-11-24");
  assert.ok(nov24);
  assert.equal(nov24.found, 1);
  assert.equal(nov24.resolved, 1);
  assert.equal(nov24.lost, 0);
});

test("computeAccountSummary and buildDashboardSummaryCsv produce structured output", () => {
  const users: AdminUser[] = [
    {
      id: "u1",
      name: "Student",
      email: "s@wmsu.edu.ph",
      role: "school_user",
      isActive: true,
      joined: "Nov 1",
      reportCount: 1,
    },
    {
      id: "u2",
      name: "Staff",
      email: "st@wmsu.edu.ph",
      role: "admin",
      isActive: false,
      joined: "Nov 1",
      reportCount: 0,
    },
    {
      id: "u3",
      name: "Admin",
      email: "ad@wmsu.edu.ph",
      role: "super_admin",
      isActive: true,
      joined: "Nov 1",
      reportCount: 0,
    },
  ];
  const accounts = computeAccountSummary(users);
  assert.deepEqual(accounts, {
    total: 3,
    schoolUsers: 1,
    staff: 1,
    admins: 1,
    active: 2,
    inactive: 1,
  });

  const csv = buildDashboardSummaryCsv({
    summary: computeDashboardSummary(sampleReports, sampleClaims, sampleReturns),
    categories: computeTopCategories(sampleReports),
    buildings: computeTopBuildings(sampleReports),
    funnel: computeRequestStatusFunnel(sampleClaims, sampleReturns),
    accounts,
  });
  assert.match(csv, /Recovery Rate \(%\),50/);
  assert.match(csv, /Accounts,School Users,1/);
});

test("getAvailableReportYears and computeMonthlyReportsTrend filter by specific month and full year", () => {
  const years = getAvailableReportYears(
    sampleReports,
    new Date("2026-11-25T12:00:00"),
  );
  assert.deepEqual(years, [2026]);

  const nov2026 = computeMonthlyReportsTrend(sampleReports, 2026, 10);
  assert.equal(nov2026.length, 6);
  const bucket21to25 = nov2026.find((b) => b.label === "21–25");
  assert.ok(bucket21to25);
  assert.equal(bucket21to25.lost, 1);
  assert.equal(bucket21to25.found, 3);

  const fullYear2026 = computeMonthlyReportsTrend(sampleReports, 2026, "all");
  assert.equal(fullYear2026.length, 12);
  const novBucket = fullYear2026[10];
  assert.equal(novBucket.label, "Nov");
  assert.equal(novBucket.lost, 1);
  assert.equal(novBucket.found, 3);

  const emptyYear = computeMonthlyReportsTrend(sampleReports, 2025, 10);
  assert.equal(
    emptyYear.every((b) => b.lost === 0 && b.found === 0 && b.resolved === 0),
    true,
  );
});

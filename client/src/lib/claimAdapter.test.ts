import assert from "node:assert/strict";
import { test } from "node:test";
import {
  toClaimRequest,
  toFoundReportClaim,
  toReturnedFoundReportClaim,
} from "./claimAdapter.ts";
import type { ServerClaim } from "@/services/claimService";
import type { ServerItem } from "@/services/itemService";

const serverClaim: ServerClaim = {
  id: "9d1f0e6a-2b3c-4d5e-8f90-1a2b3c4d5e6f",
  itemId: "3f8c1a9e-6b2d-4f5a-9c7e-1d2b3a4c5d6e",
  item: "iPhone 13",
  claimant: "Vaughn Evangelista",
  email: "vaughn@wmsu.edu.ph",
  dateLost: "2026-10-10",
  timeLost: "09:12",
  location: "Library",
  details: "Clear case with a small scratch.",
  importantDetails: "Engraved initials on the SIM tray.",
  evidence: ["https://example.com/evidence-1.jpg"],
  claimantTitle: "iPhone 13",
  color: "White",
  building: "Library",
  status: "pending",
  submitted: "2026-10-12T13:12:00",
};

test("maps a saved server claim into the school-user claim shape", () => {
  const claim = toClaimRequest(serverClaim);

  assert.equal(claim.id, serverClaim.id);
  assert.equal(claim.itemId, serverClaim.itemId);
  assert.equal(claim.item, "iPhone 13");
  assert.equal(claim.status, "Pending");
  assert.equal(claim.dateLost, "Oct 10, 2026");
  assert.equal(claim.submitted, "Oct 12, 2026, 1:12 PM");
  assert.deepEqual(claim.evidence, ["https://example.com/evidence-1.jpg"]);
});

test("maps a saved server return into a found-report submission", () => {
  const report = toFoundReportClaim(serverClaim);

  assert.equal(report.kind, "return");
  assert.equal(report.item, "iPhone 13");
  assert.equal(report.status, "Pending");
});

test("maps legacy claimed return requests to returned", () => {
  const report = toFoundReportClaim({ ...serverClaim, status: "claimed" });

  assert.equal(report.status, "Returned");
});

test("maps a claimed found post to the reporter's returned history", () => {
  const item: ServerItem = {
    id: "found-item-id",
    reporterId: "reporter-id",
    reportType: "found",
    isClaimed: true,
    isReturned: true,
    name: "Blue backpack",
    description: "A blue backpack with a keychain.",
    itemDate: "2026-10-10",
    itemTime: "09:12",
    categoryId: "bags",
    category: "Bags",
    color: "Blue",
    building: "Library",
    location: "Library",
    image: "https://example.com/backpack.jpg",
    images: ["https://example.com/backpack.jpg"],
    user: { id: "reporter-id", name: "School User 1" },
    createdAt: "2026-10-12T13:12:00",
    updatedAt: "2026-10-12T13:12:00",
  };

  const report = toReturnedFoundReportClaim(item);

  assert.equal(report?.kind, "return");
  assert.equal(report?.status, "Returned");
  assert.equal(report?.itemId, item.id);
  assert.equal(report?.claimant, item.user.name);
  assert.deepEqual(report?.evidence, item.images);
});

test("does not add an unclaimed or lost post to returned history", () => {
  const item: ServerItem = {
    id: "found-item-id",
    reporterId: "reporter-id",
    reportType: "found",
    isClaimed: false,
    isReturned: false,
    name: "Blue backpack",
    description: "A blue backpack with a keychain.",
    itemDate: "2026-10-10",
    itemTime: null,
    categoryId: "bags",
    category: "Bags",
    color: null,
    building: null,
    location: null,
    user: { id: "reporter-id", name: "School User 1" },
    createdAt: "2026-10-12T13:12:00",
    updatedAt: "2026-10-12T13:12:00",
  };

  assert.equal(toReturnedFoundReportClaim(item), null);
  assert.equal(
    toReturnedFoundReportClaim({ ...item, isClaimed: true }),
    null,
  );
  assert.equal(
    toReturnedFoundReportClaim({
      ...item,
      isClaimed: true,
      isReturned: true,
      reportType: "lost",
    }),
    null,
  );
});

test("maps every server status to its school-user badge", () => {
  const statuses = {
    pending: "Pending",
    approved: "Approved",
    claimed: "Claimed",
    returned: "Returned",
    rejected: "Rejected",
  } as const;

  for (const [serverStatus, expected] of Object.entries(statuses)) {
    const claim = toClaimRequest({
      ...serverClaim,
      status: serverStatus as ServerClaim["status"],
    });
    assert.equal(claim.status, expected);
  }
});

test("fills optional server fields with safe display defaults", () => {
  const claim = toClaimRequest({
    ...serverClaim,
    dateLost: null,
    timeLost: null,
    location: null,
    details: null,
    importantDetails: null,
    evidence: [],
    claimantTitle: null,
    color: null,
    building: null,
  });

  assert.equal(claim.dateLost, "");
  assert.equal(claim.timeLost, "");
  assert.equal(claim.location, "");
  assert.equal(claim.details, "");
  assert.equal(claim.importantDetails, undefined);
  assert.equal(claim.claimantTitle, undefined);
  assert.equal(claim.color, undefined);
  assert.equal(claim.building, undefined);
  assert.deepEqual(claim.evidence, []);
});

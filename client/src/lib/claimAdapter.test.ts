import assert from "node:assert/strict";
import { test } from "node:test";
import { toClaimRequest } from "./claimAdapter.ts";
import type { ServerClaim } from "@/services/claimService";

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

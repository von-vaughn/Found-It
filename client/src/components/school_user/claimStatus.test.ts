import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claimBelongsToSection,
  SECTION_STATUS_TABS,
  submissionStatusLabel,
} from "./claimStatus.ts";

test("shows an approved found report as approved", () => {
  assert.equal(
    submissionStatusLabel({ status: "Approved", kind: "return" }),
    "Approved",
  );
});

test("keeps an approved ownership claim as approved", () => {
  assert.equal(
    submissionStatusLabel({ status: "Approved", kind: "claim" }),
    "Approved",
  );
});

test("shows a pending found report as pending", () => {
  assert.equal(
    submissionStatusLabel({ status: "Pending", kind: "return" }),
    "Pending",
  );
});

test("partitions ownership claims and return reports into their sections", () => {
  assert.equal(claimBelongsToSection({}, "claims"), true);
  assert.equal(claimBelongsToSection({ kind: "claim" }, "claims"), true);
  assert.equal(claimBelongsToSection({ kind: "return" }, "claims"), false);
  assert.equal(claimBelongsToSection({ kind: "return" }, "returned"), true);
  assert.equal(claimBelongsToSection({ kind: "claim" }, "returned"), false);
});

test("exposes section-specific status filter tabs", () => {
  assert.deepEqual(
    SECTION_STATUS_TABS.claims.map((tab) => tab.id),
    ["Pending", "Approved", "Claimed", "Rejected"],
  );
  assert.deepEqual(
    SECTION_STATUS_TABS.returned.map((tab) => tab.id),
    ["Pending", "Approved", "Returned", "Rejected"],
  );
});

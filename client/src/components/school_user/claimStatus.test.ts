import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLAIM_STATUS_TABS,
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

test("exposes merged status filter tabs", () => {
  assert.deepEqual(
    CLAIM_STATUS_TABS.map((tab) => tab.id),
    ["Pending", "Approved", "Claimed", "Returned", "Rejected"],
  );
});

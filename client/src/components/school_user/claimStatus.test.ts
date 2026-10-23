import assert from "node:assert/strict";
import { test } from "node:test";
import { submissionStatusLabel } from "./claimStatus.ts";

test("shows an approved found report as unclaimed", () => {
  assert.equal(
    submissionStatusLabel({ status: "Approved", kind: "return" }),
    "Unclaimed",
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

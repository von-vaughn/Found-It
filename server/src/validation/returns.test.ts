import assert from "node:assert/strict";
import { test } from "node:test";
import { validateReturnTarget } from "./returns";

const lostItem = { reporterId: "owner-id", reportType: "lost" as const };

test("accepts a lost item reported by someone else", () => {
  assert.equal(validateReturnTarget(lostItem, "finder-id"), null);
});

test("rejects a return request for a missing item", () => {
  assert.deepEqual(validateReturnTarget(null, "finder-id"), {
    status: 404,
    message: "Item not found.",
  });
});

test("rejects a return request on a found item", () => {
  assert.equal(
    validateReturnTarget({ ...lostItem, reportType: "found" }, "finder-id")?.status,
    400,
  );
});

test("rejects a return request on the reporter's own lost item", () => {
  assert.equal(
    validateReturnTarget(lostItem, lostItem.reporterId)?.status,
    400,
  );
});

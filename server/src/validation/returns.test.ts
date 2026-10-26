import assert from "node:assert/strict";
import { test } from "node:test";
import type { PoolClient } from "pg";
import { validateReturnTarget } from "./returns";
import { createRequestStatusNotification } from "../repositories/notification.repository";

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

test("notifies both finder and lost item owner when a return request is approved", async () => {
  const recordedQueries: { sql: string; values: unknown[] }[] = [];
  const mockClient = {
    query: async (sql: string, values?: unknown[]) => {
      recordedQueries.push({ sql, values: values ?? [] });
      return { rows: [], rowCount: 1 };
    },
  } as unknown as PoolClient;

  await createRequestStatusNotification(mockClient, {
    requestId: "return-req-123",
    itemId: "item-456",
    itemName: "Blue Backpack",
    kind: "return",
    status: "approved",
    requesterId: "finder-user-789",
    itemOwnerId: "owner-user-001",
  });

  assert.equal(recordedQueries.length, 2, "Should create 2 notifications");

  // First notification to finder
  const finderNotif = recordedQueries[0];
  assert.equal(finderNotif.values[0], "finder-user-789");
  assert.equal(finderNotif.values[5], "Return request approved");
  assert.equal(finderNotif.values[6], "Your return request for Blue Backpack was approved.");

  // Second notification to lost item owner
  const ownerNotif = recordedQueries[1];
  assert.equal(ownerNotif.values[0], "owner-user-001");
  assert.equal(ownerNotif.values[1], "item-456");
  assert.equal(ownerNotif.values[2], "return-req-123");
  assert.equal(ownerNotif.values[3], "return");
  assert.equal(ownerNotif.values[4], "approved");
  assert.equal(ownerNotif.values[5], "Someone returned your lost item");
  assert.equal(
    ownerNotif.values[6],
    'Someone returned your lost item "Blue Backpack". Please visit the OSA office to verify and claim it.',
  );
});

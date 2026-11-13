import assert from "node:assert/strict";
import { test } from "node:test";
import { createClaimSchema } from "./claims";
import { campusTodayDate, pastOrTodayDateSchema } from "./dates";

const validClaim = {
  itemId: "3f8c1a9e-6b2d-4f5a-9c7e-1d2b3a4c5d6e",
  claimantTitle: "Black backpack",
  color: "Black",
  building: "Library",
  dateLost: "2026-10-10",
  timeLost: "09:12",
  location: "Ground floor study area",
  details: "Has a blue star keychain on the front pocket.",
  importantDetails: "Physics notebook inside.",
  evidence: ["https://example.com/evidence-1.jpg"],
};

test("accepts a complete claim", () => {
  const result = createClaimSchema.safeParse(validClaim);
  assert.equal(result.success, true);
});

test("accepts a claim without an optional description", () => {
  const result = createClaimSchema.safeParse({ ...validClaim, details: "" });
  assert.equal(result.success, true);
});

test("defaults an omitted optional description to an empty string", () => {
  const { details: _details, ...claimWithoutDetails } = validClaim;
  const result = createClaimSchema.safeParse(claimWithoutDetails);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.details, "");
});

test("rejects a claim whose lost date is in the future", () => {
  const result = createClaimSchema.safeParse({
    ...validClaim,
    dateLost: "2999-01-01",
  });
  assert.equal(result.success, false);
});

test("rejects a claim that is not tied to a real item id", () => {
  const result = createClaimSchema.safeParse({
    ...validClaim,
    itemId: "item-2",
  });
  assert.equal(result.success, false);
});

test("rejects more than four evidence photos", () => {
  const result = createClaimSchema.safeParse({
    ...validClaim,
    evidence: Array.from(
      { length: 5 },
      (_, index) => `https://example.com/evidence-${index}.jpg`,
    ),
  });
  assert.equal(result.success, false);
});

test("uses Asia/Manila date after midnight UTC+8 while UTC is still previous day", () => {
  const afterMidnightManila = new Date("2026-11-13T16:15:00Z");
  assert.equal(campusTodayDate(afterMidnightManila), "2026-11-14");
});

test("rejects impossible calendar dates such as Feb 29 on non-leap years", () => {
  const result = pastOrTodayDateSchema.safeParse("2026-02-29");
  assert.equal(result.success, false);
});

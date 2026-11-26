import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Item } from "../../data/mockItems.ts";
import { resolveRelatedTargetType, selectRelatedItems } from "./relatedItems.ts";

function makeItem(
  overrides: Partial<Item> & Pick<Item, "id" | "type" | "category">,
): Item {
  return {
    id: overrides.id,
    reporterId: overrides.reporterId ?? "other-user",
    title: overrides.title ?? overrides.id,
    type: overrides.type,
    category: overrides.category,
    location: "Main Gate",
    date: "2026-11-26",
    timeAgo: "1h ago",
    image: "",
    description: "Sample item",
    status: "active",
    contactName: "Sample User",
  };
}

describe("relatedItems", () => {
  const candidates: Item[] = [
    makeItem({ id: "lost-own", type: "lost", category: "electronics", reporterId: "owner-1" }),
    makeItem({ id: "lost-other-1", type: "lost", category: "electronics", reporterId: "user-2" }),
    makeItem({ id: "found-own", type: "found", category: "electronics", reporterId: "owner-1" }),
    makeItem({ id: "found-suggested", type: "found", category: "electronics", reporterId: "user-3" }),
    makeItem({ id: "found-other-1", type: "found", category: "electronics", reporterId: "user-4" }),
    makeItem({ id: "found-bags", type: "found", category: "bags", reporterId: "user-5" }),
  ];

  it("resolves opposite type for own posts and same type for others' posts", () => {
    assert.equal(resolveRelatedTargetType("lost", true), "found");
    assert.equal(resolveRelatedTargetType("found", true), "lost");
    assert.equal(resolveRelatedTargetType("found", false), "found");
    assert.equal(resolveRelatedTargetType("lost", false), "lost");
  });

  it("shows same-category Found items (excluding suggested matches & own posts) for own Lost item", () => {
    const result = selectRelatedItems({
      currentItem: candidates[0],
      candidates,
      isOwnItem: true,
      viewerId: "owner-1",
      excludeIds: new Set(["found-suggested"]),
    });
    assert.equal(result.targetType, "found");
    assert.deepEqual(
      result.items.map((entry) => entry.id),
      ["found-other-1"],
    );
  });

  it("shows same-category Lost items (excluding own posts) for own Found item", () => {
    const result = selectRelatedItems({
      currentItem: candidates[2],
      candidates,
      isOwnItem: true,
      viewerId: "owner-1",
    });
    assert.equal(result.targetType, "lost");
    assert.deepEqual(
      result.items.map((entry) => entry.id),
      ["lost-other-1"],
    );
  });

  it("shows same-category Found items when viewing someone else's Found item", () => {
    const result = selectRelatedItems({
      currentItem: candidates[4],
      candidates,
      isOwnItem: false,
      viewerId: "viewer-9",
    });
    assert.equal(result.targetType, "found");
    assert.deepEqual(
      result.items.map((entry) => entry.id),
      ["found-own", "found-suggested"],
    );
  });

  it("shows same-category Lost items when viewing someone else's Lost item", () => {
    const result = selectRelatedItems({
      currentItem: candidates[1],
      candidates,
      isOwnItem: false,
      viewerId: "viewer-9",
    });
    assert.equal(result.targetType, "lost");
    assert.deepEqual(
      result.items.map((entry) => entry.id),
      ["lost-own"],
    );
  });
});

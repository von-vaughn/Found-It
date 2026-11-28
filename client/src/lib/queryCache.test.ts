import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterInfinitePages,
  isInfiniteData,
  mapInfinitePages,
  prependToInfinitePages,
} from "./queryCache.ts";

interface Row {
  id: string;
  label: string;
}

describe("queryCache helpers", () => {
  it("distinguishes InfiniteData objects from plain arrays and primitives", () => {
    assert.equal(isInfiniteData({ pages: [], pageParams: [] }), true);
    assert.equal(isInfiniteData([]), false);
    assert.equal(isInfiniteData(null), false);
    assert.equal(isInfiniteData(undefined), false);
  });

  it("prepends to page 0 and deduplicates across all pages", () => {
    const initial = {
      pages: [
        { items: [{ id: "1", label: "One" }], hasMore: true },
        { items: [{ id: "2", label: "Old Two" }, { id: "3", label: "Three" }], hasMore: false },
      ],
      pageParams: [0, 1],
    };

    const next = prependToInfinitePages(initial, "items", {
      id: "2",
      label: "Updated Two",
    });

    assert.deepEqual(next?.pages[0].items, [
      { id: "2", label: "Updated Two" },
      { id: "1", label: "One" },
    ]);
    assert.deepEqual(next?.pages[1].items, [{ id: "3", label: "Three" }]);
  });

  it("maps items across every page without mutating original pages", () => {
    const initial = {
      pages: [
        { rows: [{ id: "a", label: "alpha" }], hasMore: true },
        { rows: [{ id: "b", label: "beta" }], hasMore: false },
      ],
      pageParams: [0, 1],
    };

    const next = mapInfinitePages(initial, "rows", (row: Row) =>
      row.id === "b" ? { ...row, label: "BETA" } : row,
    );

    assert.equal(next?.pages[0].rows[0].label, "alpha");
    assert.equal(next?.pages[1].rows[0].label, "BETA");
    assert.equal(initial.pages[1].rows[0].label, "beta");
  });

  it("filters items across all pages and ignores undefined data", () => {
    assert.equal(
      filterInfinitePages<"rows", { rows: Row[] }>(
        undefined,
        "rows",
        () => true,
      ),
      undefined,
    );

    const initial = {
      pages: [
        { rows: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
        { rows: [{ id: "c", label: "C" }] },
      ],
      pageParams: [0, 2],
    };

    const next = filterInfinitePages(initial, "rows", (row) => row.id !== "b");
    assert.deepEqual(
      next?.pages.map((p) => p.rows.map((r) => r.id)),
      [["a"], ["c"]],
    );
  });
});

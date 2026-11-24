import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCategoryLabel, isOtherCategory } from "./categoryLabel.ts";

test("isOtherCategory matches other and others case-insensitively", () => {
  assert.equal(isOtherCategory("other"), true);
  assert.equal(isOtherCategory("Others"), true);
  assert.equal(isOtherCategory("  OTHER  "), true);
  assert.equal(isOtherCategory("electronics"), false);
  assert.equal(isOtherCategory(""), false);
});

test("formatCategoryLabel appends trimmed customCategory only for Other categories", () => {
  assert.equal(formatCategoryLabel("other", "  Helmet  "), "Other (Helmet)");
  assert.equal(formatCategoryLabel("others", "Camera"), "Others (Camera)");
  assert.equal(formatCategoryLabel("other", "   "), "Other");
  assert.equal(formatCategoryLabel("other", null), "Other");
  assert.equal(formatCategoryLabel("electronics", "Ignored"), "Electronics");
  assert.equal(formatCategoryLabel("wallets-purses"), "Wallet");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { extractIdNumberFromEmail } from "./idNumber.ts";

test("extracts ID number from typical WMSU student email", () => {
  assert.equal(extractIdNumberFromEmail("ty202500492@wmsu.edu.ph"), "202500492");
});

test("extracts ID number from default profile email", () => {
  assert.equal(extractIdNumberFromEmail("ve202100318@wmsu.edu.ph"), "202100318");
});

test("extracts ID number from digits-only local part", () => {
  assert.equal(extractIdNumberFromEmail("202500492@wmsu.edu.ph"), "202500492");
});

test("extracts ID number when local part has separators", () => {
  assert.equal(extractIdNumberFromEmail("ty-202500492@wmsu.edu.ph"), "202500492");
});

test("returns null for non-numeric email", () => {
  assert.equal(extractIdNumberFromEmail("vaughn@wmsu.edu.ph"), null);
});

test("returns null for empty string", () => {
  assert.equal(extractIdNumberFromEmail(""), null);
});

test("returns null for null input", () => {
  assert.equal(extractIdNumberFromEmail(null), null);
});

test("returns null for undefined input", () => {
  assert.equal(extractIdNumberFromEmail(undefined), null);
});
